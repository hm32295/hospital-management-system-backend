const express = require("express");
const { getStockOverview, getExpiryReport, getExpiredStock, getLowStock, getStockTransactions } = require("../controllers/stockController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const stockRouter = express.Router();

stockRouter.get("/overview", protect, authorize("admin", "pharmacist"), getStockOverview);
stockRouter.get("/expiry", protect, authorize("admin", "pharmacist"), getExpiryReport);
stockRouter.get("/expired", protect, authorize("admin", "pharmacist"), getExpiredStock);
stockRouter.get("/low-stock", protect, authorize("admin", "pharmacist"), getLowStock);
stockRouter.get("/transactions", protect, authorize("admin", "pharmacist"), getStockTransactions);

module.exports = stockRouter;