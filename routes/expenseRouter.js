const express = require("express");
const { createExpense, getAllExpenses } = require("../controllers/expenseController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const expenseRouter = express.Router();

expenseRouter.post("/", protect, authorize("admin", "receptionist"), createExpense);
expenseRouter.get("/", protect, authorize("admin", "receptionist"), getAllExpenses);

module.exports = expenseRouter;