const express = require("express");


const { createStockTransaction, getAllStockTransactions ,getSingleStockTransactions} = require("../controllers/stockTransactionController");
const protect = require("../middlewares/authMiddleware");

const stockTransactionRouter = express.Router();

stockTransactionRouter.post("/", protect, createStockTransaction);

stockTransactionRouter.get("/",protect,getAllStockTransactions);
stockTransactionRouter.get("/:id",protect,getSingleStockTransactions);

module.exports = stockTransactionRouter;