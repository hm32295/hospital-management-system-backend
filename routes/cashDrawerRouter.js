const express = require("express");

const { openCashDrawer, getCurrentCashDrawer, closeCashDrawer, getAllCashDrawers, getSingleCashDrawer,
} = require("../controllers/cashDrawerController");
const protect = require("../middlewares/authMiddleware");
const cashDrawerRouter = express.Router();

cashDrawerRouter.post( "/open", protect, openCashDrawer);

cashDrawerRouter.get( "/current", protect, getCurrentCashDrawer);

cashDrawerRouter.get( "/", protect, getAllCashDrawers);

cashDrawerRouter.put( "/:id/close", protect, closeCashDrawer);

cashDrawerRouter.get( "/:id", protect, getSingleCashDrawer);

module.exports = cashDrawerRouter;