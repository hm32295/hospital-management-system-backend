const express = require("express");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const {
  getAllCashTransactions,
  getCashTransactionSummary,
  getSingleCashTransaction,
} = require("../controllers/cashTransactionController");

const cashTransactionRouter = express.Router();

cashTransactionRouter.get(
  "/summary",
  protect,
  authorize("admin", "receptionist"),
  getCashTransactionSummary
);

cashTransactionRouter.get(
  "/",
  protect,
  authorize("admin", "receptionist"),
  getAllCashTransactions
);

cashTransactionRouter.get(
  "/:id",
  protect,
  authorize("admin", "receptionist"),
  getSingleCashTransaction
);

module.exports = cashTransactionRouter;