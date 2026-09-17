const express = require("express");

const { createPurchase, getAllPurchases, getSinglePurchase, cancelPurchase, confirmPurchase,
} = require("../controllers/purchaseController");
const protect = require("../middlewares/authMiddleware");


const purchaseRouter = express.Router();

purchaseRouter.post( "/", protect, createPurchase);

purchaseRouter.get( "/", protect, getAllPurchases);

purchaseRouter.get( "/:id", protect, getSinglePurchase);

purchaseRouter.patch( "/:id/confirm", protect, confirmPurchase);

purchaseRouter.delete( "/:id/cancel", protect, cancelPurchase);

module.exports = purchaseRouter;