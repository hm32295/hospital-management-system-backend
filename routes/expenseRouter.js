const express = require("express");

const {
  createExpense,
  getAllExpenses,
} = require("../controllers/expenseController");

const protect = require("../middlewares/authMiddleware");

const expenseRouter = express.Router();

expenseRouter.post("/", protect, createExpense);
expenseRouter.get("/",protect,getAllExpenses);

module.exports = expenseRouter;