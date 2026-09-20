const express = require("express");
const {
  createDoctorSettlement,
  getDoctorAccount,
  getOperationSettlements,
  getDoctorSettlements,
  getSingleDoctorSettlement,
} = require("../controllers/doctorSettlementController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const doctorSettlementRouter = express.Router();

doctorSettlementRouter.post("/", protect, authorize("admin", "receptionist"), createDoctorSettlement);
doctorSettlementRouter.get("/doctor/:doctorId/account", protect, authorize("admin", "doctor", "receptionist"), getDoctorAccount);
doctorSettlementRouter.get("/operation/:operationId", protect, authorize("admin", "doctor", "receptionist"), getOperationSettlements);
doctorSettlementRouter.get("/doctor/:doctorId", protect, authorize("admin", "doctor", "receptionist"), getDoctorSettlements);
doctorSettlementRouter.get("/:id", protect, authorize("admin", "doctor", "receptionist"), getSingleDoctorSettlement);

module.exports = doctorSettlementRouter;