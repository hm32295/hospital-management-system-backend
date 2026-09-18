const express = require("express");

const { createDoctorSettlement, getDoctorAccount, getOperationSettlements, getDoctorSettlements, getSingleDoctorSettlement,
} = require("../controllers/doctorSettlementController");

const protect = require("../middlewares/authMiddleware");

const doctorSettlementRouter = express.Router();
doctorSettlementRouter.post("/", protect, createDoctorSettlement)
    .get("/doctor/:doctorId/account", protect, getDoctorAccount)
    .get("/operation/:operationId", protect, getOperationSettlements)
    .get("/doctor/:doctorId", protect, getDoctorSettlements)
    .get("/:id", protect, getSingleDoctorSettlement);
module.exports = doctorSettlementRouter;