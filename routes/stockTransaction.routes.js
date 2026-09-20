const express = require("express");

const { createStockTransaction, getAllStockTransactions, getSingleStockTransactions,
} = require("../controllers/stockTransactionController");

const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const stockTransactionRouter = express.Router();

stockTransactionRouter.post( "/", protect, authorize("admin", "pharmacist"), createStockTransaction
);

stockTransactionRouter.get( "/", protect, authorize("admin", "pharmacist"), getAllStockTransactions
);

stockTransactionRouter.get( "/:id", protect, authorize("admin", "pharmacist"), getSingleStockTransactions
);

module.exports = stockTransactionRouter;