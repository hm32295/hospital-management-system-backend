
const visitModels = require("../models/visit.model");
const patientModels = require("../models/patient.models");
const specialtyModels = require("../models/specialty.model");
const doctorModels = require("../models/doctor.model");

const FIRST_VISIT_FEE = 70;
const FOLLOW_UP_FEE = 30;

const createVisit = async (req, res) => {
  try {
    const {
      patient,
      specialty,
      doctor,
    } = req.body;

    if (!patient) {
      return res.status(400).json({
        success: false,
        message: "Patient is required",
      });
    }

    if (!specialty) {
      return res.status(400).json({
        success: false,
        message: "Specialty is required",
      });
    }

    const existingPatient =
      await patientModels.findById(patient);

    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const existingSpecialty =
      await specialtyModels.findOne({
        _id: specialty,
        isActive: true,
      });

    if (!existingSpecialty) {
      return res.status(404).json({
        success: false,
        message: "Specialty not found",
      });
    }

    if (doctor) {
      const existingDoctor =
        await doctorModels.findOne({
          _id: doctor,
          specialties: specialty,
          isActive: true,
        });

      if (!existingDoctor) {
        return res.status(400).json({
          success: false,
          message:
            "Doctor does not belong to this specialty",
        });
      }
    }

    let visitType = "first";
    let consultationFee = FIRST_VISIT_FEE;

    const previousVisit =
      await visitModels.findOne({
        patient,
        specialty,
        status: {
          $ne: "cancelled",
        },
      });

    if (previousVisit) {
      visitType = "follow_up";
      consultationFee = FOLLOW_UP_FEE;
    }

    const visit =
      await visitModels.create({
        patient,
        specialty,
        doctor: doctor || null,
        visitType,
        consultationFee,
      });

    const createdVisit =
      await visitModels
        .findById(visit._id)
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "specialty",
          "name"
        )
        .populate(
          "doctor",
          "name phone"
        );

    return res.status(201).json({
      success: true,
      message:
        "Visit created successfully",
      visit: createdVisit,
    });
  } catch (error) {
    console.error(
      "Create visit error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
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

    const filter = {};

    if (patient) {
      filter.patient = patient;
    }

    if (specialty) {
      filter.specialty = specialty;
    }

    if (doctor) {
      filter.doctor = doctor;
    }

    if (visitType) {
      filter.visitType = visitType;
    }

    if (paymentStatus) {
      filter.paymentStatus =
        paymentStatus;
    }

    if (status) {
      filter.status = status;
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(
        Number(limit) || 10,
        1
      ),
      100
    );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const total =
      await visitModels.countDocuments(
        filter
      );

    const visits =
      await visitModels
        .find(filter)
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "specialty",
          "name"
        )
        .populate(
          "doctor",
          "name"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      visits,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get all visits error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getSingleVisit = async (
  req,
  res
) => {
  try {
    const visit =
      await visitModels
        .findById(req.params.id)
        .populate(
          "patient",
          "name phone email nationalId dateOfBirth gender"
        )
        .populate(
          "specialty",
          "name"
        )
        .populate(
          "doctor",
          "name phone email"
        );

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    return res.status(200).json({
      success: true,
      visit,
    });
  } catch (error) {
    console.error(
      "Get single visit error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateVisitStatus = async (
  req,
  res
) => {
  try {
    const { status } = req.body;

    const allowedTransitions = {
      waiting: [
        "in_consultation",
        "cancelled",
      ],
      in_consultation: [
        "completed",
        "cancelled",
      ],
      completed: [],
      cancelled: [],
    };

    if (
      !allowedTransitions[status]
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid visit status",
      });
    }

    const visit =
      await visitModels.findById(
        req.params.id
      );

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    if (
      !allowedTransitions[
        visit.status
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot change visit status from ${visit.status} to ${status}`,
      });
    }

    if (
      status === "in_consultation"
    ) {
      if (
        visit.paymentStatus !==
        "paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Visit payment must be completed before starting consultation",
        });
      }

      if (!visit.doctor) {
        return res.status(400).json({
          success: false,
          message:
            "A doctor must be assigned before starting consultation",
        });
      }

      if (!visit.patient) {
        return res.status(400).json({
          success: false,
          message:
            "A patient is required before starting consultation",
        });
      }
    }

    visit.status = status;

    if (status === "completed") {
      visit.completedAt =
        new Date();
    }

    await visit.save();

    const updatedVisit =
      await visitModels
        .findById(visit._id)
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "specialty",
          "name"
        )
        .populate(
          "doctor",
          "name"
        );

    return res.status(200).json({
      success: true,
      message:
        "Visit status updated successfully",
      visit: updatedVisit,
    });
  } catch (error) {
    console.error(
      "Update visit status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createVisit,
  getAllVisits,
  getSingleVisit,
  updateVisitStatus,
};
