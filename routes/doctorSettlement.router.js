const express = require("express");

const { createDoctorSettlement, getOperationSettlements, getDoctorSettlements, getSingleDoctorSettlement,
} = require("../controllers/doctorSettlementController");

const protect = require("../middlewares/authMiddleware");

const doctorSettlementRouter = express.Router();

doctorSettlementRouter.post( "/", protect, createDoctorSettlement );
doctorSettlementRouter.get( "/operation/:operationId", protect, getOperationSettlements );
doctorSettlementRouter.get( "/doctor/:doctorId", protect, getDoctorSettlements );
doctorSettlementRouter.get( "/:id", protect, getSingleDoctorSettlement );
module.exports = doctorSettlementRouter;