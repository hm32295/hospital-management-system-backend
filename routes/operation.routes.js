
const express = require("express");
const {
  createOperation,
  getAllOperations,
  getSingleOperation,
  updateOperation,
  cancelOperation,
  completeOperation,
} = require("../controllers/operationController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const operationRouter = express.Router();

operationRouter.post("/", protect, authorize("admin", "receptionist"), createOperation);
operationRouter.get("/", protect, authorize("admin", "doctor", "receptionist"), getAllOperations);
operationRouter.patch("/:id/complete", protect, authorize("admin", "doctor", "receptionist"), completeOperation);
operationRouter.get("/:id", protect, authorize("admin", "doctor", "receptionist"), getSingleOperation);
operationRouter.put("/:id", protect, authorize("admin", "receptionist"), updateOperation);
operationRouter.delete("/:id", protect, authorize("admin", "receptionist"), cancelOperation);

module.exports = operationRouter;
