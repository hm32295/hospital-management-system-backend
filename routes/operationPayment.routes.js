const express = require("express");

const { createOperationPayment, getOperationPayments, getSinglePayment,
} = require("../controllers/paymentController");
const protect = require("../middlewares/authMiddleware");
const operationPaymentRouter = express.Router();

operationPaymentRouter.post( "/", protect, createOperationPayment
);
operationPaymentRouter.get( "/operation/:operationId", protect, getOperationPayments
);
operationPaymentRouter.get( "/:id", protect, getSinglePayment
);

module.exports = operationPaymentRouter;