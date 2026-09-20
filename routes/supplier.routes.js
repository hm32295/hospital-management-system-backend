const express = require("express");

const {
  createSupplier,
  getAllSuppliers,
  getSingleSupplier,
  updateSupplier,
  deactivateSupplier,
} = require("../controllers/supplierController");

const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const supplierRouter = express.Router();

supplierRouter.post(
  "/",
  protect,
  authorize("admin", "pharmacist"),
  createSupplier
);

supplierRouter.get(
  "/",
  protect,
  authorize("admin", "pharmacist"),
  getAllSuppliers
);

supplierRouter.get(
  "/:id",
  protect,
  authorize("admin", "pharmacist"),
  getSingleSupplier
);

supplierRouter.put(
  "/:id",
  protect,
  authorize("admin", "pharmacist"),
  updateSupplier
);

supplierRouter.delete(
  "/deactivate/:id",
  protect,
  authorize("admin", "pharmacist"),
  deactivateSupplier
);

module.exports = supplierRouter;