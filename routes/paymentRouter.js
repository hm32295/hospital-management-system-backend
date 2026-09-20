const express = require("express");
const { createPayment, createVisitPayment, createOperationPayment, getAllPayments, getSinglePayment, getSalePayments, getVisitPayments, getOperationPayments, getPatientPayments } = require("../controllers/paymentController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const paymentRouter = express.Router();

paymentRouter.post("/", protect, authorize("admin", "pharmacist", "receptionist"), createPayment);
paymentRouter.post("/visit/:visitId", protect, authorize("admin", "receptionist"), createVisitPayment);
paymentRouter.post("/operation", protect, authorize("admin", "receptionist"), createOperationPayment);
paymentRouter.get("/", protect, authorize("admin", "pharmacist", "receptionist"), getAllPayments);
paymentRouter.get("/sale/:saleId", protect, authorize("admin", "pharmacist", "receptionist"), getSalePayments);
paymentRouter.get("/visit/:visitId", protect, authorize("admin", "doctor", "nurse", "receptionist"), getVisitPayments);
paymentRouter.get("/operation/:operationId", protect, authorize("admin", "doctor", "receptionist"), getOperationPayments);
paymentRouter.get("/patient/:patientId", protect, authorize("admin", "doctor", "pharmacist", "nurse", "receptionist"), getPatientPayments);
paymentRouter.get("/:id", protect, authorize("admin", "pharmacist", "receptionist"), getSinglePayment);

module.exports = paymentRouter;