const express = require("express");
const { createBatch, getAllBatches, getBatchBarcode, getSingleBatch, updateBatch, deactivateBatch, getStockDashboard, generateMissingBarcode } = require("../controllers/medicineBatchController");
const protect = require("../middlewares/authMiddleware");


const medicineBatchRouter = express.Router();

medicineBatchRouter.post("/", createBatch);

medicineBatchRouter.get("/", getAllBatches);

medicineBatchRouter.get("/dashboard", protect, getStockDashboard);

// medicineBatchRouter.post("/generate-missing-barcode", generateMissingBarcode);

medicineBatchRouter.get("/:id/barcode", getBatchBarcode);

medicineBatchRouter.get("/:id", getSingleBatch);

medicineBatchRouter.put("/:id", updateBatch);

medicineBatchRouter.delete("/deactivate/:id", deactivateBatch);

module.exports = medicineBatchRouter;