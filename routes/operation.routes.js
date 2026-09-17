const express = require("express");

const protect = require("../middlewares/authMiddleware");

const { createOperation, getAllOperations, getSingleOperation, updateOperation, cancelOperation, completeOperation,
} = require("../controllers/operationController");

const operationRouter = express.Router();

operationRouter.post( "/", protect, createOperation);
operationRouter.get("/", protect, getAllOperations);
operationRouter.patch("/:id/complete", protect, completeOperation);
operationRouter.get( "/:id", protect, getSingleOperation);
operationRouter.put( "/:id", protect, updateOperation);
operationRouter.delete( "/:id", protect, cancelOperation);

module.exports = operationRouter;