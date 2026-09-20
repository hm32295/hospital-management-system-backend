const express = require("express");

const {
  createPurchase,
  getAllPurchases,
  getSinglePurchase,
  cancelPurchase,
  confirmPurchase,
} = require("../controllers/purchaseController");

const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const purchaseRouter = express.Router();

purchaseRouter.post(
  "/",
  protect,
  authorize("admin", "pharmacist"),
  createPurchase
);

purchaseRouter.get(
  "/",
  protect,
  authorize("admin", "pharmacist"),
  getAllPurchases
);

purchaseRouter.get(
  "/:id",
  protect,
  authorize("admin", "pharmacist"),
  getSinglePurchase
);

purchaseRouter.patch(
  "/:id/confirm",
  protect,
  authorize("admin", "pharmacist"),
  confirmPurchase
);

purchaseRouter.delete(
  "/:id/cancel",
  protect,
  authorize("admin", "pharmacist"),
  cancelPurchase
);

module.exports = purchaseRouter;