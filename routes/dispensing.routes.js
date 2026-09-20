const express = require("express");
const { createDispensing, getAllDispenses, getSingleDispenses, getAvailableSalesForDispensing } = require("../controllers/dispensingController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const dispensingRouter = express.Router();

dispensingRouter.post("/", protect, authorize("admin", "pharmacist"), createDispensing);
dispensingRouter.get("/", protect, authorize("admin", "doctor", "pharmacist", "nurse", "receptionist"), getAllDispenses);
dispensingRouter.get("/available-sales", protect, authorize("admin", "pharmacist"), getAvailableSalesForDispensing);
dispensingRouter.get("/:id", protect, authorize("admin", "doctor", "pharmacist", "nurse", "receptionist"), getSingleDispenses);

module.exports = dispensingRouter;