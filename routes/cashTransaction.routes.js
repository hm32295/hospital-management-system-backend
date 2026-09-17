
const express = require("express");

const protect = require("../middlewares/authMiddleware");

const { getAllCashTransactions, getCashTransactionSummary, getSingleCashTransaction,
} = require("../controllers/cashTransactionController");

const cashTransactionRouter = express.Router();

cashTransactionRouter.get( "/summary", protect, getCashTransactionSummary);
cashTransactionRouter.get( "/", protect, getAllCashTransactions);
cashTransactionRouter.get( "/:id", protect, getSingleCashTransaction);
module.exports = cashTransactionRouter;