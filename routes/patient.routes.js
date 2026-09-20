const express = require("express");

const { createPatient, getAllPatient, getSinglePatient, getPatientDetails, updatePatient, deactivatePatient,
} = require("../controllers/patientController");

const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const patientRouter = express.Router();

const patientRoles = [ "admin", "doctor", "pharmacist", "nurse", "receptionist",];

// Get all patients
patientRouter.get( "/", protect, authorize(...patientRoles), getAllPatient);
// Create patient
patientRouter.post( "/", protect, authorize(...patientRoles), createPatient);
// Get patient details
patientRouter.get( "/:id/details", protect, authorize(...patientRoles), getPatientDetails);
// Get single patient
patientRouter.get( "/:id", protect, authorize(...patientRoles), getSinglePatient);
// Update patient
patientRouter.put( "/:id", protect, authorize(...patientRoles), updatePatient);
// Deactivate patient
patientRouter.patch( "/:id/deactivate", protect, authorize("admin", "receptionist"), deactivatePatient);
module.exports = patientRouter;