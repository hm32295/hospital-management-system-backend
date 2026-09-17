const express = require("express");

const {
  createVisit,
  getAllVisits,
  getSingleVisit,
  updateVisitStatus,
} = require("../controllers/visitController");

const protect = require("../middlewares/authMiddleware");

const visitRouter = express.Router();

visitRouter.post("/", protect, createVisit);
visitRouter.get("/", protect, getAllVisits);
visitRouter.get("/:id", protect, getSingleVisit);
visitRouter.patch("/:id/status", protect, updateVisitStatus);

module.exports = visitRouter;