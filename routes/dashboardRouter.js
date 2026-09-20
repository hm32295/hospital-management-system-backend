const express = require("express");
const { getDashboard } = require("../controllers/dashboardController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const dashboardRouter = express.Router();

dashboardRouter.get("/", protect, authorize("admin"), getDashboard);

module.exports = dashboardRouter;