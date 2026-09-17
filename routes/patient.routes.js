
const express = require("express");

const {createPatient,getAllPatient,getSinglePatient,getPatientDetails,updatePatient,deactivatePatient,
} = require("../controllers/patientController");

const protect = require("../middlewares/authMiddleware");

const patientRouter =express.Router();

// Get all patients
patientRouter.get("/",protect,getAllPatient);

// Create patient
patientRouter.post("/",protect,createPatient);

// Get patient details
patientRouter.get("/:id/details",protect,getPatientDetails);

// Get single patient
patientRouter.get("/:id",protect,getSinglePatient);

// Update patient
patientRouter.put("/:id",protect,updatePatient);

// Deactivate patient
patientRouter.patch("/:id/deactivate",protect,deactivatePatient);

module.exports =patientRouter;