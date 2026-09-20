const express = require("express");
const { createVisit, getAllVisits, getSingleVisit, updateVisitStatus } = require("../controllers/visitController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const visitRouter = express.Router();

visitRouter.post("/", protect, authorize("admin", "receptionist"), createVisit);
visitRouter.get("/", protect, authorize("admin", "doctor", "nurse", "receptionist"), getAllVisits);
visitRouter.get("/:id", protect, authorize("admin", "doctor", "nurse", "receptionist"), getSingleVisit);
visitRouter.patch("/:id/status", protect, authorize("admin", "doctor", "receptionist"), updateVisitStatus);

module.exports = visitRouter;