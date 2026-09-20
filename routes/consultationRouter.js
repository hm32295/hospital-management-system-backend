const express = require("express");
const {
  createConsultation,
  getConsultationByVisit,
  updateConsultation,
  completeConsultation,
} = require("../controllers/consultationController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const consultationRouter = express.Router();

consultationRouter.post("/", protect, authorize("admin", "doctor"), createConsultation);
consultationRouter.post("/complete", protect, authorize("admin", "doctor"), completeConsultation);
consultationRouter.get("/visit/:visitId", protect, authorize("admin", "doctor", "nurse", "receptionist"), getConsultationByVisit);
consultationRouter.put("/:id", protect, authorize("admin", "doctor"), updateConsultation);

module.exports = consultationRouter;
