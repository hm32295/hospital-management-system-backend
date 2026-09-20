const express = require("express");
const { openCashDrawer, getCurrentCashDrawer, closeCashDrawer, getAllCashDrawers, getSingleCashDrawer } = require("../controllers/cashDrawerController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const cashDrawerRouter = express.Router();

cashDrawerRouter.post("/open", protect, authorize("admin", "receptionist"), openCashDrawer);
cashDrawerRouter.get("/current", protect, authorize("admin", "receptionist"), getCurrentCashDrawer);
cashDrawerRouter.get("/", protect, authorize("admin", "receptionist"), getAllCashDrawers);
cashDrawerRouter.put("/:id/close", protect, authorize("admin", "receptionist"), closeCashDrawer);
cashDrawerRouter.get("/:id", protect, authorize("admin", "receptionist"), getSingleCashDrawer);

module.exports = cashDrawerRouter;