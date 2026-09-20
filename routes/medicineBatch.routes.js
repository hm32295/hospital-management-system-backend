const express = require("express");

const {
  createBatch,
  getAllBatches,
  getBatchBarcode,
  getSingleBatch,
  updateBatch,
  deactivateBatch,
  getStockDashboard,
  generateMissingBarcode,
} = require("../controllers/medicineBatchController");

const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const medicineBatchRouter = express.Router();

medicineBatchRouter.post(
  "/",
  protect,
  authorize("admin", "pharmacist"),
  createBatch
);

medicineBatchRouter.get(
  "/",
  protect,
  authorize("admin", "pharmacist"),
  getAllBatches
);

medicineBatchRouter.get(
  "/dashboard",
  protect,
  authorize("admin", "pharmacist"),
  getStockDashboard
);

// medicineBatchRouter.post(
//   "/generate-missing-barcode",
//   protect,
//   authorize("admin"),
//   generateMissingBarcode
// );

medicineBatchRouter.get(
  "/:id/barcode",
  protect,
  authorize("admin", "pharmacist"),
  getBatchBarcode
);

medicineBatchRouter.get(
  "/:id",
  protect,
  authorize("admin", "pharmacist"),
  getSingleBatch
);

medicineBatchRouter.put(
  "/:id",
  protect,
  authorize("admin", "pharmacist"),
  updateBatch
);

medicineBatchRouter.delete(
  "/deactivate/:id",
  protect,
  authorize("admin", "pharmacist"),
  deactivateBatch
);

module.exports = medicineBatchRouter;