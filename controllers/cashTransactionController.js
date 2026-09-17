const CashTransaction = require("../models/cashTransaction.model");

const getAllCashTransactions = async ( req, res ) => {
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
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (cashDrawer) {
      filter.cashDrawer = cashDrawer;
    }

    if (type) {
      filter.type = type;
    }

    if (source) {
      filter.source = source;
    }

    if (doctor) {
      filter.doctor = doctor;
    }

    if (operation) {
      filter.operation = operation;
    }

    if (visit) {
      filter.visit = visit;
    }

    if (patient) {
      filter.patient = patient;
    }

    if (sale) {
      filter.sale = sale;
    }

    if (payment) {
      filter.payment = payment;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte =
          new Date(fromDate);
      }

      if (toDate) {
        const endDate =
          new Date(toDate);

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte =
          endDate;
      }
    }

    const skip =
      (Number(page) - 1) *
      Number(limit);

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
          "name email phone specialty"
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
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(Number(limit)),

      CashTransaction.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(
          total / Number(limit)
        ),
      },
    });
  } catch (error) {
    console.error(
      "GET CASH TRANSACTIONS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch cash transactions",
      error: error.message,
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

      const match = {};

      if (cashDrawer) {
        match.cashDrawer =
          cashDrawer;
      }

      if (fromDate || toDate) {
        match.createdAt = {};

        if (fromDate) {
          match.createdAt.$gte =
            new Date(fromDate);
        }

        if (toDate) {
          const endDate =
            new Date(toDate);

          endDate.setHours(
            23,
            59,
            59,
            999
          );

          match.createdAt.$lte =
            endDate;
        }
      }

      const summary =
        await CashTransaction.aggregate([
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
        const {
          type,
          source,
        } = item._id;

        const amount =
          item.total;

        const count =
          item.count;

        if (type === "income") {
          totalIncome += amount;
          incomeCount += count;

          if (
            source ===
            "sale_payment"
          ) {
            salePayments +=
              amount;
          }

          if (
            source ===
            "visit_payment"
          ) {
            visitPayments +=
              amount;
          }

          if (
            source ===
            "operation_payment"
          ) {
            operationPayments +=
              amount;
          }
        }

        if (type === "expense") {
          totalExpense += amount;
          expenseCount += count;

          if (
            source === "expense"
          ) {
            expenses += amount;
          }

          if (
            source ===
            "doctor_settlement"
          ) {
            doctorSettlements +=
              amount;
          }

          if (
            source === "refund"
          ) {
            refunds += amount;
          }

          if (
            source === "other"
          ) {
            other += amount;
          }
        }
      });

      const netCash =
        totalIncome -
        totalExpense;

      return res.status(200).json({
        success: true,
        summary: {
          totalIncome,
          totalExpense,
          netCash,
          incomeCount,
          expenseCount,
          totalTransactions:
            incomeCount +
            expenseCount,

          incomeSources: {
            salePayments,
            visitPayments,
            operationPayments,
          },

          expenseSources: {
            expenses,
            doctorSettlements,
            refunds,
            other,
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
        message:
          "Failed to fetch cash transaction summary",
        error: error.message,
      });
    }
  };

const getSingleCashTransaction =async (req, res) => {
    try {
      const transaction =
        await CashTransaction.findById(
          req.params.id
        )
          .populate(
            "cashDrawer",
            "openedBy closedBy openingBalance expectedCash actualCash difference status"
          )
          .populate(
            "doctor",
            "name email phone specialty"
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
          message:
            "Cash transaction not found",
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
        message:
          "Failed to fetch cash transaction",
        error: error.message,
      });
    }
  };

module.exports = {
  getAllCashTransactions,
  getCashTransactionSummary,
  getSingleCashTransaction,
};