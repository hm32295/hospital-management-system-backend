
const doctorModels = require("../models/doctor.model");
const specialtyModels = require("../models/specialty.model");
const doctorSettlementModels = require("../models/doctorSettlementModel");
const operationModels = require('../models/operation.model')

const createDoctor = async (req, res) => {
  try {
    const {
      name,
      specialties,
      phone,
      email,
    } = req.body;

    if (
      !name?.trim() ||
      !Array.isArray(specialties) ||
      specialties.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor name and at least one specialty are required",
      });
    }

    const uniqueSpecialties = [
      ...new Set(specialties.map(String)),
    ];

    const existingSpecialties =
      await specialtyModels.find({
        _id: { $in: uniqueSpecialties },
        isActive: true,
      });

    if (
      existingSpecialties.length !==
      uniqueSpecialties.length
    ) {
      return res.status(404).json({
        success: false,
        message:
          "One or more specialties not found or inactive",
      });
    }

    const existingDoctor =
      await doctorModels.findOne({
        name: name.trim(),
        isActive: true,
        specialties: {
          $all: uniqueSpecialties,
        },
      });

    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message:
          "Doctor already exists with these specialties",
      });
    }

    const doctor =
      await doctorModels.create({
        name: name.trim(),
        specialties: uniqueSpecialties,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
      });

    const createdDoctor =
      await doctorModels
        .findById(doctor._id)
        .populate("specialties", "name");

    return res.status(201).json({
      success: true,
      message:
        "Doctor created successfully",
      doctor: createdDoctor,
    });
  } catch (error) {
    console.error(
      "Create doctor error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

 
const getAllDoctors = async (req, res) => {
  try {
    const {
      search,
      specialty,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {
      isActive: true,
    };

    if (search?.trim()) {
      filter.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    if (specialty) {
      filter.specialties = specialty;
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const total =
      await doctorModels.countDocuments(
        filter
      );

    const doctors =
      await doctorModels
        .find(filter)
        .populate("specialties", "name")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();

    if (!doctors.length) {
      return res.status(200).json({
        success: true,
        doctors: [],
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(
            total / limitNumber
          ),
        },
      });
    }

    const doctorIds =
      doctors.map(
        (doctor) => doctor._id
      );

    /*
      =========================
      GET DOCTOR OPERATIONS
      =========================
    */

    const operations =
      await operationModels
        .find({
          doctor: {
            $in: doctorIds,
          },
          status: {
            $ne: "cancelled",
          },
        })
        .select(
          "doctor doctorFeeAmount"
        )
        .lean();

    /*
      =========================
      GET DOCTOR SETTLEMENTS
      =========================

      Only completed settlements
      count as money paid to doctor.
    */

    const settlements =
      await doctorSettlementModels
        .find({
          doctor: {
            $in: doctorIds,
          },
          status: "completed",
        })
        .select(
          "doctor amount"
        )
        .lean();

    /*
      =========================
      CREATE ACCOUNT MAP
      =========================
    */

    const accounts = new Map();

    doctorIds.forEach(
      (doctorId) => {
        accounts.set(
          doctorId.toString(),
          {
            earned: 0,
            paid: 0,
            due: 0,
          }
        );
      }
    );

    /*
      =========================
      CALCULATE EARNED
      =========================
    */

    operations.forEach(
      (operation) => {
        if (!operation.doctor) {
          return;
        }

        const account =
          accounts.get(
            operation.doctor.toString()
          );

        if (!account) return;

        account.earned += Number(
          operation.doctorFeeAmount || 0
        );
      }
    );

    /*
      =========================
      CALCULATE PAID
      =========================
    */

    settlements.forEach(
      (settlement) => {
        if (!settlement.doctor) {
          return;
        }

        const account =
          accounts.get(
            settlement.doctor.toString()
          );

        if (!account) return;

        account.paid += Number(
          settlement.amount || 0
        );
      }
    );

    /*
      =========================
      CALCULATE DUE
      =========================
    */

    accounts.forEach(
      (account) => {
        account.due = Math.max(
          account.earned -
            account.paid,
          0
        );
      }
    );

    /*
      =========================
      ATTACH ACCOUNT
      =========================
    */

    const doctorsWithAccounts =
      doctors.map(
        (doctor) => ({
          ...doctor,
          account:
            accounts.get(
              doctor._id.toString()
            ) || {
              earned: 0,
              paid: 0,
              due: 0,
            },
        })
      );

    return res.status(200).json({
      success: true,
      doctors:
        doctorsWithAccounts,
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
      "Get doctors error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


const getSingleDoctor = async (req, res) => {
  try {
    const doctor =await doctorModels.findById(req.params.id)
        .populate(
          "specialties",
          "name"
        );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error(
      "Get doctor error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const {
      name,
      specialties,
      phone,
      email,
      isActive,
    } = req.body;

    if (
      !name?.trim() ||
      !Array.isArray(specialties) ||
      specialties.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor name and at least one specialty are required",
      });
    }

    const uniqueSpecialties = [
      ...new Set(specialties.map(String)),
    ];

    const existingSpecialties =
      await specialtyModels.find({
        _id: { $in: uniqueSpecialties },
        isActive: true,
      });

    if (
      existingSpecialties.length !==
      uniqueSpecialties.length
    ) {
      return res.status(404).json({
        success: false,
        message:
          "One or more specialties not found or inactive",
      });
    }

    const existingDoctor =
      await doctorModels.findOne({
        name: name.trim(),
        isActive: true,
        specialties: {
          $all: uniqueSpecialties,
        },
        _id: {
          $ne: req.params.id,
        },
      });

    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message:
          "Doctor already exists with these specialties",
      });
    }

    const doctor =
      await doctorModels
        .findByIdAndUpdate(
          req.params.id,
          {
            name: name.trim(),
            specialties: uniqueSpecialties,
            phone: phone?.trim() || null,
            email: email?.trim() || null,
            isActive:
              typeof isActive === "boolean"
                ? isActive
                : true,
          },
          {
            new: true,
            runValidators: true,
          }
        )
        .populate(
          "specialties",
          "name"
        );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Doctor updated successfully",
      doctor,
    });
  } catch (error) {
    console.error(
      "Update doctor error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const deactivateDoctor = async (req, res) => {
  try {
    const doctor =
      await doctorModels.findByIdAndUpdate(
        req.params.id,
        {
          isActive: false,
        },
        {
          new: true,
        }
      );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Doctor deactivated successfully",
    });
  } catch (error) {
    console.error(
      "Deactivate doctor error:",
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
  createDoctor,
  getAllDoctors,
  getSingleDoctor,
  updateDoctor,
  deactivateDoctor,
};
