const express = require("express");

const { getStockOverview, getExpiryReport, getExpiredStock, getLowStock, getStockTransactions,
} = require("../controllers/stockController");
const protect = require("../middlewares/authMiddleware");


const stockRouter = express.Router();


stockRouter.get( "/overview", protect, getStockOverview);

stockRouter.get( "/expiry", protect, getExpiryReport);

stockRouter.get( "/expired", protect, getExpiredStock);

stockRouter.get( "/low-stock", protect, getLowStock);

stockRouter.get( "/transactions", protect, getStockTransactions);


module.exports = stockRouter;