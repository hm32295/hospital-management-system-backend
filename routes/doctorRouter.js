const express = require("express");

const {
  createDoctor,
  getAllDoctors,
  getSingleDoctor,
  updateDoctor,
  deactivateDoctor,
} = require("../controllers/doctorController");

const protect = require("../middlewares/authMiddleware");

const doctorRouter = express.Router();

doctorRouter.post("/", protect, createDoctor);
doctorRouter.get("/", protect, getAllDoctors);
doctorRouter.get("/:id", protect, getSingleDoctor);
doctorRouter.put("/:id", protect, updateDoctor);
doctorRouter.delete("/:id", protect, deactivateDoctor);

module.exports = doctorRouter;