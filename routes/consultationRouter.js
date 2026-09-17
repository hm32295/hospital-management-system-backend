const express = require("express");

const {
  createConsultation,
  getConsultationByVisit,
  updateConsultation,
  completeConsultation,
} = require("../controllers/consultationController");

const protect = require("../middlewares/authMiddleware");

const consultationRouter =
  express.Router();

consultationRouter.post(
  "/",
  protect,
  createConsultation
);

consultationRouter.post(
  "/complete",
  protect,
  completeConsultation
);

consultationRouter.get(
  "/visit/:visitId",
  protect,
  getConsultationByVisit
);

consultationRouter.put(
  "/:id",
  protect,
  updateConsultation
);

module.exports =
  consultationRouter;