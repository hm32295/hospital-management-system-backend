const mongoose = require("mongoose");
const specialtyModels = require("../models/specialty.model");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const createSpecialty = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.nameRequired"),
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidDescription"),
      });
    }

    const specialtyName = name.trim();

    const existingSpecialty = await specialtyModels.findOne({
      name: specialtyName,
    });

    if (existingSpecialty) {
      return res.status(409).json({
        success: false,
        message: req.t("specialties.alreadyExists"),
      });
    }

    const specialty = await specialtyModels.create({
      name: specialtyName,
      description: description?.trim() || null,
    });

    return res.status(201).json({
      success: true,
      message: req.t("specialties.createdSuccessfully"),
      specialty,
    });
  } catch (error) {
    console.error("Create specialty error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: req.t("specialties.alreadyExists"),
      });
    }

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getAllSpecialties = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidPage"),
      });
    }

    if (
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidLimit"),
      });
    }

    if (search !== undefined && typeof search !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidSearch"),
      });
    }

    const filter = {
      isActive: true,
    };

    if (search?.trim()) {
      filter.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [total, specialties] = await Promise.all([
      specialtyModels.countDocuments(filter),
      specialtyModels
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      specialties,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get specialties error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getSingleSpecialty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidId"),
      });
    }

    const specialty = await specialtyModels.findById(id);

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: req.t("specialties.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      specialty,
    });
  } catch (error) {
    console.error("Get specialty error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const updateSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidId"),
      });
    }

    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidName"),
      });
    }

    if (description !== undefined && description !== null && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidDescription"),
      });
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidIsActive"),
      });
    }

    const specialty = await specialtyModels.findById(id);

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: req.t("specialties.notFound"),
      });
    }

    if (name !== undefined) {
      const specialtyName = name.trim();

      if (!specialtyName) {
        return res.status(400).json({
          success: false,
          message: req.t("specialties.nameCannotBeEmpty"),
        });
      }

      const existingSpecialty = await specialtyModels.findOne({
        name: specialtyName,
        _id: { $ne: id },
      });

      if (existingSpecialty) {
        return res.status(409).json({
          success: false,
          message: req.t("specialties.alreadyExists"),
        });
      }

      specialty.name = specialtyName;
    }

    if (description !== undefined) {
      specialty.description = description?.trim() || null;
    }

    if (isActive !== undefined) {
      specialty.isActive = isActive;
    }

    await specialty.save();

    return res.status(200).json({
      success: true,
      message: req.t("specialties.updatedSuccessfully"),
      specialty,
    });
  } catch (error) {
    console.error("Update specialty error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: req.t("specialties.alreadyExists"),
      });
    }

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const deactivateSpecialty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.invalidId"),
      });
    }

    const specialty = await specialtyModels.findById(id);

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: req.t("specialties.notFound"),
      });
    }

    if (!specialty.isActive) {
      return res.status(400).json({
        success: false,
        message: req.t("specialties.alreadyInactive"),
      });
    }

    specialty.isActive = false;
    await specialty.save();

    return res.status(200).json({
      success: true,
      message: req.t("specialties.deactivatedSuccessfully"),
      specialty,
    });
  } catch (error) {
    console.error("Deactivate specialty error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

module.exports = {
  createSpecialty,
  getAllSpecialties,
  getSingleSpecialty,
  updateSpecialty,
  deactivateSpecialty,
};