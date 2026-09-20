const mongoose = require("mongoose");
const CashTransaction = require("../models/cashTransaction.model");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const allowedTypes = ["income", "expense"];

const allowedSources = [
  "operation_payment",
  "doctor_settlement",
  "sale_payment",
  "visit_payment",
  "expense",
  "refund",
  "other",
];

const parseDate = (value) => {
  if (!value || typeof value !== "string") return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const buildDateFilter = (fromDate, toDate) => {
  if (!fromDate && !toDate) return null;

  const createdAt = {};

  if (fromDate) {
    const startDate = parseDate(fromDate);

    if (!startDate) {
      return { error: "invalidFromDate" };
    }

    startDate.setHours(0, 0, 0, 0);
    createdAt.$gte = startDate;
  }

  if (toDate) {
    const endDate = parseDate(toDate);

    if (!endDate) {
      return { error: "invalidToDate" };
    }

    endDate.setHours(23, 59, 59, 999);
    createdAt.$lte = endDate;
  }

  if (
    createdAt.$gte &&
    createdAt.$lte &&
    createdAt.$gte > createdAt.$lte
  ) {
    return { error: "invalidDateRange" };
  }

  return createdAt;
};

const getPagination = (query) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    return { error: "invalidPage" };
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { error: "invalidLimit" };
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const validateFilterId = (value, key) => {
  if (!value) return null;

  if (!isValidId(value)) {
    return key;
  }

  return null;
};

const getAllCashTransactions = async (req, res) => {
  try {
    const {
      cashDrawer,
      type,
      source,
      doctor,
      operation,
      visit,
      patient,
      sale,
      payment,
      fromDate,
      toDate,
    } = req.query;

    const pagination = getPagination(req.query);

    if (pagination.error) {
      return res.status(400).json({
        success: false,
        message: req.t(`cashTransactions.${pagination.error}`),
      });
    }

    const idFilters = [
      ["cashDrawer", cashDrawer],
      ["doctor", doctor],
      ["operation", operation],
      ["visit", visit],
      ["patient", patient],
      ["sale", sale],
      ["payment", payment],
    ];

    for (const [key, value] of idFilters) {
      const error = validateFilterId(value, `invalid${key[0].toUpperCase()}${key.slice(1)}Id`);

      if (error) {
        return res.status(400).json({
          success: false,
          message: req.t(`cashTransactions.${error}`),
        });
      }
    }

    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: req.t("cashTransactions.invalidType"),
      });
    }

    if (source && !allowedSources.includes(source)) {
      return res.status(400).json({
        success: false,
        message: req.t("cashTransactions.invalidSource"),
      });
    }

    const dateFilter = buildDateFilter(fromDate, toDate);

    if (dateFilter?.error) {
      return res.status(400).json({
        success: false,
        message: req.t(`cashTransactions.${dateFilter.error}`),
      });
    }

    const filter = {};

    if (cashDrawer) filter.cashDrawer = cashDrawer;
    if (type) filter.type = type;
    if (source) filter.source = source;
    if (doctor) filter.doctor = doctor;
    if (operation) filter.operation = operation;
    if (visit) filter.visit = visit;
    if (patient) filter.patient = patient;
    if (sale) filter.sale = sale;
    if (payment) filter.payment = payment;
    if (dateFilter) filter.createdAt = dateFilter;

    const { page, limit, skip } = pagination;

    const [
      transactions,
      total,
    ] = await Promise.all([
      CashTransaction.find(filter)
        .populate(
          "cashDrawer",
          "openedBy closedBy openingBalance expectedCash actualCash difference status"
        )
        .populate(
          "doctor",
          "name email phone specialties"
        )
        .populate(
          "operation",
          "operationName operationDate totalAmount doctorFeeAmount hospitalAmount paidAmount remainingAmount paymentStatus status"
        )
        .populate(
          "visit",
          "patient specialty doctor visitType consultationFee paymentStatus status completedAt"
        )
        .populate(
          "sale",
          "patient items totalAmount discount paidAmount remainingAmount paymentStatus status createdAt"
        )
        .populate(
          "payment",
          "type sale visit operation patient amount receivedBy cashDrawer status notes createdAt"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      CashTransaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET CASH TRANSACTIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: req.t("cashTransactions.fetchFailed"),
    });
  }
};

const getCashTransactionSummary = async (req, res) => {
  try {
    const {
      cashDrawer,
      fromDate,
      toDate,
    } = req.query;

    if (cashDrawer && !isValidId(cashDrawer)) {
      return res.status(400).json({
        success: false,
        message: req.t("cashTransactions.invalidCashDrawerId"),
      });
    }

    const dateFilter = buildDateFilter(fromDate, toDate);

    if (dateFilter?.error) {
      return res.status(400).json({
        success: false,
        message: req.t(`cashTransactions.${dateFilter.error}`),
      });
    }

    const match = {};

    if (cashDrawer) {
      match.cashDrawer = new mongoose.Types.ObjectId(cashDrawer);
    }

    if (dateFilter) {
      match.createdAt = dateFilter;
    }

    const summary = await CashTransaction.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: {
            type: "$type",
            source: "$source",
          },
          total: {
            $sum: "$amount",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    let salePayments = 0;
    let visitPayments = 0;
    let operationPayments = 0;

    let expenses = 0;
    let doctorSettlements = 0;
    let refunds = 0;
    let other = 0;

    summary.forEach((item) => {
      const { type, source } = item._id;
      const amount = Number(item.total || 0);
      const count = Number(item.count || 0);

      if (type === "income") {
        totalIncome += amount;
        incomeCount += count;

        if (source === "sale_payment") {
          salePayments += amount;
        } else if (source === "visit_payment") {
          visitPayments += amount;
        } else if (source === "operation_payment") {
          operationPayments += amount;
        }
      }

      if (type === "expense") {
        totalExpense += amount;
        expenseCount += count;

        if (source === "expense") {
          expenses += amount;
        } else if (source === "doctor_settlement") {
          doctorSettlements += amount;
        } else if (source === "refund") {
          refunds += amount;
        } else if (source === "other") {
          other += amount;
        }
      }
    });

    totalIncome = Number(totalIncome.toFixed(2));
    totalExpense = Number(totalExpense.toFixed(2));

    return res.status(200).json({
      success: true,
      summary: {
        totalIncome,
        totalExpense,
        netCash: Number((totalIncome - totalExpense).toFixed(2)),
        incomeCount,
        expenseCount,
        totalTransactions: incomeCount + expenseCount,
        incomeSources: {
          salePayments: Number(salePayments.toFixed(2)),
          visitPayments: Number(visitPayments.toFixed(2)),
          operationPayments: Number(operationPayments.toFixed(2)),
        },
        expenseSources: {
          expenses: Number(expenses.toFixed(2)),
          doctorSettlements: Number(doctorSettlements.toFixed(2)),
          refunds: Number(refunds.toFixed(2)),
          other: Number(other.toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error(
      "GET CASH TRANSACTION SUMMARY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("cashTransactions.summaryFailed"),
    });
  }
};

const getSingleCashTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("cashTransactions.invalidId"),
      });
    }

    const transaction = await CashTransaction.findById(id)
      .populate(
        "cashDrawer",
        "openedBy closedBy openingBalance expectedCash actualCash difference status"
      )
      .populate(
        "doctor",
        "name email phone specialties"
      )
      .populate(
        "operation",
        "operationName operationDate totalAmount doctorFeeAmount hospitalAmount paidAmount remainingAmount paymentStatus status"
      )
      .populate(
        "visit",
        "patient specialty doctor visitType consultationFee paymentStatus status completedAt"
      )
      .populate(
        "sale",
        "patient items totalAmount discount paidAmount remainingAmount paymentStatus status createdAt"
      )
      .populate(
        "payment",
        "type sale visit operation patient amount receivedBy cashDrawer status notes createdAt"
      )
      .populate(
        "patient",
        "name phone"
      )
      .populate(
        "createdBy",
        "name email role"
      );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: req.t("cashTransactions.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error(
      "GET SINGLE CASH TRANSACTION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("cashTransactions.fetchFailed"),
    });
  }
};

module.exports = {
  getAllCashTransactions,
  getCashTransactionSummary,
  getSingleCashTransaction,
};