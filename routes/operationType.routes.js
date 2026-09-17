
const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {
  createOperationType,
  getAllOperationTypes,
  getSingleOperationType,
  updateOperationType,
  deactivateOperationType,
} = require("../controllers/operationTypeController");

const operationTypeRouter =
  express.Router();

operationTypeRouter.post(
  "/",
  protect,
  createOperationType
);

operationTypeRouter.get(
  "/",
  protect,
  getAllOperationTypes
);

operationTypeRouter.get(
  "/:id",
  protect,
  getSingleOperationType
);

operationTypeRouter.put(
  "/:id",
  protect,
  updateOperationType
);

operationTypeRouter.delete(
  "/:id",
  protect,
  deactivateOperationType
);

module.exports = operationTypeRouter;
