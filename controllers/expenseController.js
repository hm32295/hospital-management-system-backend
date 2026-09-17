
const mongoose = require("mongoose");
const expenseModels = require("../models/expense.models");
const cashDrawerModels = require("../models/cashDrawer.models");
const cashTransactionModels = require("../models/cashTransaction.model");

// Create Expense
const createExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          "Cash drawer, amount, category and description are required",
      });
    }

    if (Number(amount) <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Expense amount must be greater than zero",
      });
    }

    if (paymentMethod !== "cash") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Only cash expenses are supported",
      });
    }

    const drawer = await cashDrawerModels
      .findById(cashDrawer)
      .session(session);

    if (!drawer) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Cash drawer not found",
      });
    }

    if (drawer.status !== "open") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cash drawer is closed",
      });
    }

    const expenseAmount = Number(amount);

    if (expenseAmount > drawer.expectedCash) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Expense cannot be greater than available cash (${drawer.expectedCash})`,
      });
    }

    const expense = await expenseModels.create(
      [
        {
          cashDrawer: drawer._id,
          createdBy: req.user._id,
          amount: expenseAmount,
          category,
          description,
          paymentMethod,
          notes,
          status: "completed",
        },
      ],
      { session }
    );

    const createdExpense = expense[0];

    const cashTransaction = await cashTransactionModels.create(
      [
        {
          cashDrawer: drawer._id,
          type: "expense",
          source: "expense",
          amount: expenseAmount,
          createdBy: req.user._id,
          notes: notes || description,
        },
      ],
      { session }
    );

    drawer.expectedCash -= expenseAmount;

    await drawer.save({ session });

    await session.commitTransaction();

    const populatedExpense = await expenseModels
      .findById(createdExpense._id)
      .populate(
        "cashDrawer",
        "openingBalance expectedCash actualCash status"
      )
      .populate("createdBy", "name email role");

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      expense: populatedExpense,
      cashTransaction: cashTransaction[0],
      drawer: {
        id: drawer._id,
        expectedCash: drawer.expectedCash,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Get All Expenses
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

    const filter = {};

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        startDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    if (status) {
      filter.status = status;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (category) {
      filter.category = category;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip = (pageNumber - 1) * limitNumber;

    const total = await expenseModels.countDocuments(filter);

    const expenses = await expenseModels
      .find(filter)
      .populate(
        "cashDrawer",
        "openingBalance expectedCash actualCash status"
      )
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
};
