const mongoose = require("mongoose");
const visitModels = require("../models/visit.model");
const patientModels = require("../models/patient.models");
const specialtyModels = require("../models/specialty.model");
const doctorModels = require("../models/doctor.model");

const FIRST_VISIT_FEE = 70;
const FOLLOW_UP_FEE = 30;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const createVisit = async (req, res) => {
  try {
    const { patient, specialty, doctor } = req.body;

    if (!patient || !specialty) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.patientSpecialtyRequired"),
      });
    }

    if (!isValidId(patient)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidPatientId"),
      });
    }

    if (!isValidId(specialty)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidSpecialtyId"),
      });
    }

    if (doctor !== undefined && doctor !== null && !isValidId(doctor)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidDoctorId"),
      });
    }

    const existingPatient = await patientModels.findOne({
      _id: patient,
      isActive: true,
    });

    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        message: req.t("visits.patientNotFound"),
      });
    }

    const existingSpecialty = await specialtyModels.findOne({
      _id: specialty,
      isActive: true,
    });

    if (!existingSpecialty) {
      return res.status(404).json({
        success: false,
        message: req.t("visits.specialtyNotFound"),
      });
    }

    if (doctor) {
      const existingDoctor = await doctorModels.findOne({
        _id: doctor,
        specialties: specialty,
        isActive: true,
      });

      if (!existingDoctor) {
        return res.status(400).json({
          success: false,
          message: req.t("visits.doctorNotBelongToSpecialty"),
        });
      }
    }

    let visitType = "first";
    let consultationFee = FIRST_VISIT_FEE;

    const previousVisit = await visitModels.findOne({
      patient,
      specialty,
      status: { $ne: "cancelled" },
    });

    if (previousVisit) {
      visitType = "follow_up";
      consultationFee = FOLLOW_UP_FEE;
    }

    const visit = await visitModels.create({
      patient,
      specialty,
      doctor: doctor || null,
      visitType,
      consultationFee,
    });

    const createdVisit = await visitModels.findById(visit._id)
      .populate("patient", "name phone")
      .populate("specialty", "name")
      .populate("doctor", "name phone");

    return res.status(201).json({
      success: true,
      message: req.t("visits.createdSuccessfully"),
      visit: createdVisit,
    });
  } catch (error) {
    console.error("Create visit error:", error);
    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getAllVisits = async (req, res) => {
  try {
    const {
      patient,
      specialty,
      doctor,
      visitType,
      paymentStatus,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidPage"),
      });
    }

    if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidLimit"),
      });
    }

    if (patient && !isValidId(patient)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidPatientId"),
      });
    }

    if (specialty && !isValidId(specialty)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidSpecialtyId"),
      });
    }

    if (doctor && !isValidId(doctor)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidDoctorId"),
      });
    }

    if (visitType && !["first", "follow_up"].includes(visitType)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidVisitType"),
      });
    }

    if (paymentStatus && !["pending", "paid", "cancelled"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidPaymentStatus"),
      });
    }

    if (status && !["waiting", "in_consultation", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidStatus"),
      });
    }

    const filter = {};

    if (patient) filter.patient = patient;
    if (specialty) filter.specialty = specialty;
    if (doctor) filter.doctor = doctor;
    if (visitType) filter.visitType = visitType;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (status) filter.status = status;

    const skip = (pageNumber - 1) * limitNumber;

    const [total, visits] = await Promise.all([
      visitModels.countDocuments(filter),
      visitModels.find(filter)
        .populate("patient", "name phone")
        .populate("specialty", "name")
        .populate("doctor", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
    ]);

    return res.status(200).json({
      success: true,
      visits,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get all visits error:", error);
    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getSingleVisit = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidId"),
      });
    }

    const visit = await visitModels.findById(req.params.id)
      .populate("patient", "name phone email nationalId dateOfBirth gender")
      .populate("specialty", "name")
      .populate("doctor", "name phone email");

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: req.t("visits.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      visit,
    });
  } catch (error) {
    console.error("Get single visit error:", error);
    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const updateVisitStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidId"),
      });
    }

    const allowedTransitions = {
      waiting: ["in_consultation", "cancelled"],
      in_consultation: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    if (!Object.prototype.hasOwnProperty.call(allowedTransitions, status)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidStatus"),
      });
    }

    const visit = await visitModels.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: req.t("visits.notFound"),
      });
    }

    if (!allowedTransitions[visit.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: req.t("visits.invalidStatusTransition", {
          from: visit.status,
          to: status,
        }),
      });
    }

    if (status === "in_consultation") {
      if (visit.paymentStatus !== "paid") {
        return res.status(400).json({
          success: false,
          message: req.t("visits.paymentRequired"),
        });
      }

      if (!visit.doctor) {
        return res.status(400).json({
          success: false,
          message: req.t("visits.doctorRequired"),
        });
      }

      if (!visit.patient) {
        return res.status(400).json({
          success: false,
          message: req.t("visits.patientRequired"),
        });
      }
    }

    visit.status = status;

    if (status === "completed") {
      visit.completedAt = new Date();
    }

    await visit.save();

    const updatedVisit = await visitModels.findById(visit._id)
      .populate("patient", "name phone")
      .populate("specialty", "name")
      .populate("doctor", "name");

    return res.status(200).json({
      success: true,
      message: req.t("visits.statusUpdatedSuccessfully"),
      visit: updatedVisit,
    });
  } catch (error) {
    console.error("Update visit status error:", error);
    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

module.exports = {
  createVisit,
  getAllVisits,
  getSingleVisit,
  updateVisitStatus,
};