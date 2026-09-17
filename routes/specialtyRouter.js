const express = require("express");


const protect = require("../middlewares/authMiddleware");
const { createSpecialty, getAllSpecialties, getSingleSpecialty, updateSpecialty, deactivateSpecialty } = require("../controllers/specialtyController");

const specialtyRouter = express.Router();

specialtyRouter.post("/", protect, createSpecialty);
specialtyRouter.get("/", protect, getAllSpecialties);
specialtyRouter.get("/:id", protect, getSingleSpecialty);
specialtyRouter.put("/:id", protect, updateSpecialty);
specialtyRouter.delete("/:id", protect, deactivateSpecialty);

module.exports = specialtyRouter;