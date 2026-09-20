const express = require("express");

const {
  createOperationPayment,
  getOperationPayments,
  getSinglePayment,
} = require("../controllers/paymentController");

const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const operationPaymentRouter = express.Router();

operationPaymentRouter.post(
  "/",
  protect,
  authorize("admin", "receptionist"),
  createOperationPayment
);

operationPaymentRouter.get(
  "/operation/:operationId",
  protect,
  authorize("admin", "doctor", "receptionist"),
  getOperationPayments
);

operationPaymentRouter.get(
  "/:id",
  protect,
  authorize("admin", "doctor", "receptionist"),
  getSinglePayment
);

module.exports = operationPaymentRouter;