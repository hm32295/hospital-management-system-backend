const express = require("express");

const {
  getDashboard,
} = require("../controllers/dashboardController");

const protect = require("../middlewares/authMiddleware");

const dashboardRouter =express.Router();



dashboardRouter.get(
  "/",
//   protect,
  getDashboard
);


module.exports = dashboardRouter;