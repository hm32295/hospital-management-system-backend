const express = require("express");

const { createSupplier, getAllSuppliers, getSingleSupplier, updateSupplier, deactivateSupplier,
} = require("../controllers/supplierController");
const protect = require("../middlewares/authMiddleware");


const supplierRouter = express.Router();

supplierRouter.post( "/", protect, createSupplier);

supplierRouter.get( "/", protect, getAllSuppliers);

supplierRouter.get( "/:id", protect, getSingleSupplier);

supplierRouter.put( "/:id", protect, updateSupplier);

supplierRouter.delete( "/deactivate/:id", protect, deactivateSupplier);

module.exports = supplierRouter;