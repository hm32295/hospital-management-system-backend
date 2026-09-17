
const specialtyModels = require("../models/specialty.model");

// Create Specialty
const createSpecialty = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Specialty name is required",
      });
    }

    const specialtyName = name.trim();

    const existingSpecialty =
      await specialtyModels.findOne({
        name: specialtyName,
      });

    if (existingSpecialty) {
      return res.status(400).json({
        success: false,
        message: "Specialty already exists",
      });
    }

    const specialty =
      await specialtyModels.create({
        name: specialtyName,
        description:
          description?.trim() || null,
      });

    return res.status(201).json({
      success: true,
      message: "Specialty created successfully",
      specialty,
    });
  } catch (error) {
    console.error(
      "CREATE SPECIALTY ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Specialty already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get All Active Specialties
const getAllSpecialties = async (req, res) => {
  try {
    const {
      search,
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
      await specialtyModels.countDocuments(
        filter
      );

    const specialties =
      await specialtyModels
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      specialties,
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
      "GET SPECIALTIES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Single Specialty
const getSingleSpecialty = async (req, res) => {
  try {
    const specialty =
      await specialtyModels.findById(
        req.params.id
      );

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: "Specialty not found",
      });
    }

    return res.status(200).json({
      success: true,
      specialty,
    });
  } catch (error) {
    console.error(
      "GET SPECIALTY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update Specialty
const updateSpecialty = async (req, res) => {
  try {
    const {
      name,
      description,
      isActive,
    } = req.body;

    const specialty =
      await specialtyModels.findById(
        req.params.id
      );

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: "Specialty not found",
      });
    }

    if (name !== undefined) {
      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Specialty name cannot be empty",
        });
      }

      const specialtyName = name.trim();

      const existingSpecialty =
        await specialtyModels.findOne({
          name: specialtyName,
          _id: { $ne: specialty._id },
        });

      if (existingSpecialty) {
        return res.status(400).json({
          success: false,
          message: "Specialty already exists",
        });
      }

      specialty.name = specialtyName;
    }

    if (description !== undefined) {
      specialty.description =
        description?.trim() || null;
    }

    if (isActive !== undefined) {
      specialty.isActive = isActive;
    }

    await specialty.save();

    return res.status(200).json({
      success: true,
      message: "Specialty updated successfully",
      specialty,
    });
  } catch (error) {
    console.error(
      "UPDATE SPECIALTY ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Specialty already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Deactivate Specialty
const deactivateSpecialty = async (req, res) => {
  try {
    const specialty =
      await specialtyModels.findById(
        req.params.id
      );

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: "Specialty not found",
      });
    }

    specialty.isActive = false;

    await specialty.save();

    return res.status(200).json({
      success: true,
      message:
        "Specialty deactivated successfully",
      specialty,
    });
  } catch (error) {
    console.error(
      "DEACTIVATE SPECIALTY ERROR:",
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
  createSpecialty,
  getAllSpecialties,
  getSingleSpecialty,
  updateSpecialty,
  deactivateSpecialty,
};
