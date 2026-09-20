const mongoose = require("mongoose");
const doctorModels = require("../models/doctor.model");
const specialtyModels = require("../models/specialty.model");
const doctorSettlementModels = require("../models/doctorSettlementModel");
const operationModels = require("../models/operation.model");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateSpecialties = async (specialties) => {
  if (!Array.isArray(specialties) || specialties.length === 0) {
    return { valid: false };
  }

  if (specialties.some((id) => !isValidId(id))) {
    return { valid: false, invalidId: true };
  }

  const uniqueSpecialties = [...new Set(specialties.map(String))];

  const existingSpecialties = await specialtyModels.find({
    _id: { $in: uniqueSpecialties },
    isActive: true,
  }).select("_id");

  if (existingSpecialties.length !== uniqueSpecialties.length) {
    return { valid: false, notFound: true };
  }

  return {
    valid: true,
    specialties: uniqueSpecialties,
  };
};


const createDoctor = async (req, res) => {
  try {
    const { name, specialties, phone, email } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.nameRequired"),
      });
    }

    if (phone !== undefined && phone !== null && typeof phone !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidPhone"),
      });
    }

    if (email !== undefined && email !== null && typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidEmail"),
      });
    }

    const specialtiesResult = await validateSpecialties(specialties);

    if (!specialtiesResult.valid) {
      if (specialtiesResult.invalidId) {
        return res.status(400).json({
          success: false,
          message: req.t("doctors.invalidSpecialtyId"),
        });
      }

      if (specialtiesResult.notFound) {
        return res.status(404).json({
          success: false,
          message: req.t("doctors.specialtiesNotFound"),
        });
      }

      return res.status(400).json({
        success: false,
        message: req.t("doctors.specialtyRequired"),
      });
    }

    const uniqueSpecialties = specialtiesResult.specialties;
    const doctorName = name.trim();

    const existingDoctor = await doctorModels.findOne({
      name: doctorName,
      isActive: true,
      specialties: { $all: uniqueSpecialties },
    });

    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message: req.t("doctors.alreadyExists"),
      });
    }

    const doctor = await doctorModels.create({
      name: doctorName,
      specialties: uniqueSpecialties,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
    });

    const createdDoctor = await doctorModels
      .findById(doctor._id)
      .populate("specialties", "name");

    return res.status(201).json({
      success: true,
      message: req.t("doctors.createdSuccessfully"),
      doctor: createdDoctor,
    });
  } catch (error) {
    console.error("Create doctor error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: req.t("doctors.alreadyExists"),
      });
    }

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
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

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidPage"),
      });
    }

    if (
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidLimit"),
      });
    }

    if (specialty && !isValidId(specialty)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidSpecialtyId"),
      });
    }

    if (search !== undefined && typeof search !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidSearch"),
      });
    }

    const filter = { isActive: true };

    if (search?.trim()) {
      filter.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    if (specialty) {
      filter.specialties = specialty;
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [total, doctors] = await Promise.all([
      doctorModels.countDocuments(filter),
      doctorModels
        .find(filter)
        .populate("specialties", "name")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
    ]);

    if (!doctors.length) {
      return res.status(200).json({
        success: true,
        doctors: [],
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber),
        },
      });
    }

    const doctorIds = doctors.map((doctor) => doctor._id);

    const [operations, settlements] = await Promise.all([
      operationModels
        .find({
          doctor: { $in: doctorIds },
          status: { $ne: "cancelled" },
        })
        .select("doctor doctorFeeAmount")
        .lean(),

      doctorSettlementModels
        .find({
          doctor: { $in: doctorIds },
          status: "completed",
        })
        .select("doctor amount")
        .lean(),
    ]);

    const accounts = new Map();

    doctorIds.forEach((doctorId) => {
      accounts.set(doctorId.toString(), {
        earned: 0,
        paid: 0,
        due: 0,
      });
    });

    operations.forEach((operation) => {
      if (!operation.doctor) return;

      const account = accounts.get(
        operation.doctor.toString()
      );

      if (!account) return;

      account.earned += Number(operation.doctorFeeAmount || 0);
    });

    settlements.forEach((settlement) => {
      if (!settlement.doctor) return;

      const account = accounts.get(
        settlement.doctor.toString()
      );

      if (!account) return;

      account.paid += Number(settlement.amount || 0);
    });

    accounts.forEach((account) => {
      account.earned = Number(account.earned.toFixed(2));
      account.paid = Number(account.paid.toFixed(2));
      account.due = Number(
        Math.max(account.earned - account.paid, 0).toFixed(2)
      );
    });

    const doctorsWithAccounts = doctors.map((doctor) => ({
      ...doctor,
      account: accounts.get(doctor._id.toString()) || {
        earned: 0,
        paid: 0,
        due: 0,
      },
    }));

    return res.status(200).json({
      success: true,
      doctors: doctorsWithAccounts,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get doctors error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getSingleDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidId"),
      });
    }

    const doctor = await doctorModels
      .findById(id)
      .populate("specialties", "name");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: req.t("doctors.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error("Get doctor error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      specialties,
      phone,
      email,
      isActive,
    } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidId"),
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.nameRequired"),
      });
    }

    if (phone !== undefined && phone !== null && typeof phone !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidPhone"),
      });
    }

    if (email !== undefined && email !== null && typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidEmail"),
      });
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidIsActive"),
      });
    }

    const specialtiesResult = await validateSpecialties(specialties);

    if (!specialtiesResult.valid) {
      if (specialtiesResult.invalidId) {
        return res.status(400).json({
          success: false,
          message: req.t("doctors.invalidSpecialtyId"),
        });
      }

      if (specialtiesResult.notFound) {
        return res.status(404).json({
          success: false,
          message: req.t("doctors.specialtiesNotFound"),
        });
      }

      return res.status(400).json({
        success: false,
        message: req.t("doctors.specialtyRequired"),
      });
    }

    const uniqueSpecialties = specialtiesResult.specialties;
    const doctorName = name.trim();

    const existingDoctor = await doctorModels.findOne({
      name: doctorName,
      isActive: true,
      specialties: { $all: uniqueSpecialties },
      _id: { $ne: id },
    });

    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message: req.t("doctors.alreadyExists"),
      });
    }

    const doctor = await doctorModels
      .findByIdAndUpdate(
        id,
        {
          name: doctorName,
          specialties: uniqueSpecialties,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          ...(isActive !== undefined && { isActive }),
        },
        {
          new: true,
          runValidators: true,
        }
      )
      .populate("specialties", "name");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: req.t("doctors.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      message: req.t("doctors.updatedSuccessfully"),
      doctor,
    });
  } catch (error) {
    console.error("Update doctor error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: req.t("doctors.alreadyExists"),
      });
    }

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const deactivateDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctors.invalidId"),
      });
    }

    const doctor = await doctorModels.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: req.t("doctors.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      message: req.t("doctors.deactivatedSuccessfully"),
    });
  } catch (error) {
    console.error("Deactivate doctor error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
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