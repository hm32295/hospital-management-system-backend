const express = require("express");
const {
  createSpecialty,
  getAllSpecialties,
  getSingleSpecialty,
  updateSpecialty,
  deactivateSpecialty,
} = require("../controllers/specialtyController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const specialtyRouter = express.Router();

specialtyRouter.post("/", protect, authorize("admin"), createSpecialty);
specialtyRouter.get("/", protect, authorize("admin", "doctor", "receptionist"), getAllSpecialties);
specialtyRouter.get("/:id", protect, authorize("admin", "doctor", "receptionist"), getSingleSpecialty);
specialtyRouter.put("/:id", protect, authorize("admin"), updateSpecialty);
specialtyRouter.delete("/:id", protect, authorize("admin"), deactivateSpecialty);

module.exports = specialtyRouter;