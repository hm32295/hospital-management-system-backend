const express = require("express");
const {
  createDoctor,
  getAllDoctors,
  getSingleDoctor,
  updateDoctor,
  deactivateDoctor,
} = require("../controllers/doctorController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const doctorRouter = express.Router();

doctorRouter.post("/", protect, authorize("admin"), createDoctor);
doctorRouter.get("/", protect, authorize("admin", "doctor", "receptionist"), getAllDoctors);
doctorRouter.get("/:id", protect, authorize("admin", "doctor", "receptionist"), getSingleDoctor);
doctorRouter.put("/:id", protect, authorize("admin"), updateDoctor);
doctorRouter.delete("/:id", protect, authorize("admin"), deactivateDoctor);

module.exports = doctorRouter;