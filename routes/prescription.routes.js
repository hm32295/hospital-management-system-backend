const express = require("express");
const { createPrescription, getAllPrescriptions, getSinglePrescription, updatePrescription, cancelPrescription, dispensePrescription, getPrescriptionByConsultation } = require("../controllers/prescriptionController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const prescriptionRouter = express.Router();

prescriptionRouter.post("/", protect, authorize("admin", "doctor"), createPrescription);
prescriptionRouter.get("/", protect, authorize("admin", "doctor", "pharmacist", "nurse", "receptionist"), getAllPrescriptions);
prescriptionRouter.get("/consultation/:consultationId", protect, authorize("admin", "doctor", "pharmacist", "nurse", "receptionist"), getPrescriptionByConsultation);
prescriptionRouter.post("/:id/dispense", protect, authorize("admin", "pharmacist"), dispensePrescription);
prescriptionRouter.get("/:id", protect, authorize("admin", "doctor", "pharmacist", "nurse", "receptionist"), getSinglePrescription);
prescriptionRouter.put("/:id", protect, authorize("admin", "doctor"), updatePrescription);
prescriptionRouter.patch("/:id/cancel", protect, authorize("admin", "doctor"), cancelPrescription);

module.exports = prescriptionRouter;