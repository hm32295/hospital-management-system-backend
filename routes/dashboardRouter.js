const express = require("express");

const {getDashboard,} = require("../controllers/dashboardController");

const dashboardRouter = express.Router();

dashboardRouter.get("/", getDashboard);

module.exports = dashboardRouter;