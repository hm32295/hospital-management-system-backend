const express = require("express");

const { createPayment, createVisitPayment, createOperationPayment, getAllPayments, getSinglePayment, getSalePayments, getVisitPayments, getOperationPayments, getPatientPayments,
} = require("../controllers/paymentController");

const protect = require("../middlewares/authMiddleware");

const paymentRouter = express.Router();
paymentRouter.post( "/", protect, createPayment);
paymentRouter.post( "/visit/:visitId", protect, createVisitPayment);
paymentRouter.post( "/operation", protect, createOperationPayment);
paymentRouter.get( "/", protect, getAllPayments);
paymentRouter.get( "/sale/:saleId", protect, getSalePayments);
paymentRouter.get( "/visit/:visitId", protect, getVisitPayments);
paymentRouter.get( "/operation/:operationId", protect, getOperationPayments);
paymentRouter.get( "/patient/:patientId", protect, getPatientPayments);
paymentRouter.get( "/:id", protect, getSinglePayment);

module.exports = paymentRouter;