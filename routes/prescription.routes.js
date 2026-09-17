const express = require("express");

const { createPrescription, getAllPrescriptions, getSinglePrescription, updatePrescription, cancelPrescription, dispensePrescription, getPrescriptionByConsultation,
} = require("../controllers/prescriptionController");
const protect = require("../middlewares/authMiddleware");


const prescriptionRouter = express.Router();

prescriptionRouter.post( "/", protect, createPrescription );

prescriptionRouter.get("/", protect, getAllPrescriptions);

prescriptionRouter.get("/consultation/:consultationId",protect,getPrescriptionByConsultation);

prescriptionRouter.post("/:id/dispense", protect, dispensePrescription);

prescriptionRouter.get( "/:id", protect, getSinglePrescription );

prescriptionRouter.put( "/:id", protect, updatePrescription );

prescriptionRouter.patch( "/:id/cancel", protect, cancelPrescription );

module.exports = prescriptionRouter;