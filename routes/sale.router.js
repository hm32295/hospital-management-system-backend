const express = require("express");
const { createSale, getAllSales, getSingleSale, getPatientSales, createSaleFromPrescription, getSaleByPrescription } = require("../controllers/saleController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const saleRouter = express.Router();

saleRouter.post("/", protect, authorize("admin", "pharmacist", "receptionist"), createSale);
saleRouter.get("/", protect, authorize("admin", "pharmacist", "receptionist"), getAllSales);
saleRouter.get("/patient/:patientId", protect, authorize("admin", "doctor", "pharmacist", "nurse", "receptionist"), getPatientSales);
saleRouter.get("/prescription/:prescriptionId", protect, authorize("admin", "doctor", "pharmacist", "nurse", "receptionist"), getSaleByPrescription);
saleRouter.get("/:id", protect, authorize("admin", "pharmacist", "receptionist"), getSingleSale);
saleRouter.post("/prescription/:prescriptionId", protect, authorize("admin", "pharmacist", "receptionist"), createSaleFromPrescription);

module.exports = saleRouter;