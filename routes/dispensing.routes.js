const express = require("express");

const { createDispensing, getAllDispenses, getSingleDispenses, getAvailableSalesForDispensing} = require("../controllers/dispensingController");
const protect = require("../middlewares/authMiddleware");



const dispensingRouter = express.Router();

dispensingRouter.post( "/",protect,createDispensing);
dispensingRouter.get( "/",protect,getAllDispenses);
dispensingRouter.get("/available-sales", getAvailableSalesForDispensing);
dispensingRouter.get( "/:id",protect,getSingleDispenses);
module.exports = dispensingRouter;

