const express = require("express");

const { createSale, getAllSales, getSingleSale, getPatientSales, createSaleFromPrescription, getSaleByPrescription,
} = require("../controllers/saleController");

const protect = require("../middlewares/authMiddleware");

const saleRouter = express.Router();

saleRouter.post( "/", protect, createSale )
            .get( "/", protect, getAllSales )
            .get("/patient/:patientId", protect, getPatientSales)
            .get("/prescription/:prescriptionId", protect, getSaleByPrescription)
            .get( "/:id", protect, getSingleSale )
            .post("/prescription/:prescriptionId",protect,createSaleFromPrescription
);
module.exports = saleRouter;