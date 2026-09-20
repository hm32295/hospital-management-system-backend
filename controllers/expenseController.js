const mongoose = require("mongoose");
const expenseModels = require("../models/expense.models");
const cashDrawerModels = require("../models/cashDrawer.models");
const cashTransactionModels = require("../models/cashTransaction.model");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : null;
};

const createExpense = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      cashDrawer,
      amount,
      category,
      description,
      paymentMethod = "cash",
      notes = "",
    } = req.body;

    if (!cashDrawer || amount === undefined || !category || !description) {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.requiredFields"),
      });
    }

    if (!isValidId(cashDrawer)) {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidCashDrawerId"),
      });
    }

    const expenseAmount = parseAmount(amount);

    if (expenseAmount === null) {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidAmount"),
      });
    }

    if (!["supplies", "maintenance", "transportation", "utilities", "salary", "other"].includes(category)) {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidCategory"),
      });
    }

    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidDescription"),
      });
    }

    if (paymentMethod !== "cash") {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.cashOnly"),
      });
    }

    if (typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidNotes"),
      });
    }

    session.startTransaction();

    const drawer = await cashDrawerModels.findById(cashDrawer).session(session);

    if (!drawer) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: req.t("expenses.cashDrawerNotFound"),
      });
    }

    if (drawer.status !== "open") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("expenses.cashDrawerClosed"),
      });
    }

    if (expenseAmount > drawer.expectedCash) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("expenses.insufficientCash"),
      });
    }

    const expense = await expenseModels.create([{
      cashDrawer: drawer._id,
      createdBy: req.user._id,
      amount: expenseAmount,
      category,
      description: description.trim(),
      paymentMethod,
      notes: notes.trim(),
      status: "completed",
    }], { session });

    const createdExpense = expense[0];

    const cashTransaction = await cashTransactionModels.create([{
      cashDrawer: drawer._id,
      type: "expense",
      source: "expense",
      amount: expenseAmount,
      createdBy: req.user._id,
      notes: notes.trim() || description.trim(),
    }], { session });

    drawer.expectedCash = Number((drawer.expectedCash - expenseAmount).toFixed(2));

    await drawer.save({ session });
    await session.commitTransaction();

    const populatedExpense = await expenseModels.findById(createdExpense._id)
      .populate("cashDrawer", "openingBalance expectedCash actualCash status")
      .populate("createdBy", "name email role");

    return res.status(201).json({
      success: true,
      message: req.t("expenses.createdSuccessfully"),
      expense: populatedExpense,
      cashTransaction: cashTransaction[0],
      drawer: {
        id: drawer._id,
        expectedCash: drawer.expectedCash,
      },
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Create expense error:", error);
    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  } finally {
    await session.endSession();
  }
};

const getAllExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentMethod,
      category,
      fromDate,
      toDate,
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidPage"),
      });
    }

    if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidLimit"),
      });
    }

    if (status && !["completed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidStatus"),
      });
    }

    if (paymentMethod && paymentMethod !== "cash") {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidPaymentMethod"),
      });
    }

    if (category && !["supplies", "maintenance", "transportation", "utilities", "salary", "other"].includes(category)) {
      return res.status(400).json({
        success: false,
        message: req.t("expenses.invalidCategory"),
      });
    }

    const filter = {};

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (category) filter.category = category;

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: req.t("expenses.invalidFromDate"),
          });
        }

        startDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: req.t("expenses.invalidToDate"),
          });
        }

        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }

      if (filter.createdAt.$gte && filter.createdAt.$lte && filter.createdAt.$gte > filter.createdAt.$lte) {
        return res.status(400).json({
          success: false,
          message: req.t("expenses.invalidDateRange"),
        });
      }
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [total, expenses] = await Promise.all([
      expenseModels.countDocuments(filter),
      expenseModels.find(filter)
        .populate("cashDrawer", "openingBalance expectedCash actualCash status")
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
    ]);

    return res.status(200).json({
      success: true,
      expenses,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get all expenses error:", error);
    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
};