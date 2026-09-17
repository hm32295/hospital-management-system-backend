const express = require("express");

const { createMedicine, getAllMedicines, getMedicineById, updateMedicine, deleteMedicine,
        } = require("../controllers/medicineController");

const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const medicineRouter = express.Router();

// Get all medicines
medicineRouter.get( "/", protect, authorize("admin", "pharmacist"), getAllMedicines );

// Get single medicine
medicineRouter.get( "/:id", protect, authorize("admin", "pharmacist"), getMedicineById );

// Create medicine
medicineRouter.post( "/", protect, authorize("admin", "pharmacist"), createMedicine );

// Update medicine
medicineRouter.put( "/:id", protect, authorize("admin", "pharmacist"), updateMedicine );

// Deactivate medicine
medicineRouter.delete( "/:id", protect, authorize("admin", "pharmacist"), deleteMedicine );

module.exports = medicineRouter;