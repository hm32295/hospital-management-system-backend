
const operationTypeModels = require("../models/operationType.model");
const specialtyModels = require("../models/specialty.model");

const createOperationType = async (req, res) => {
  try {
    const {name, specialty, description, defaultCost, defaultDoctorFeeType, defaultDoctorFeeValue} = req.body;
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Operation type name is required",
      });
    }
    if (!specialty) {
      return res.status(400).json({
        success: false,
        message: "Specialty is required",
      });
    }
    const specialtyExists = await specialtyModels.findOne({ _id: specialty,isActive: true});

    if (!specialtyExists) {
      return res.status(400).json({
        success: false,
        message: "Specialty not found or inactive",
      });
    }

    const existingOperationType = await operationTypeModels.findOne({name: name.trim(),specialty});

    if (existingOperationType) {
      return res.status(400).json({
        success: false,
        message:"Operation type already exists for this specialty",
      });
    }

    const cost = Number(defaultCost) || 0;
    const feeValue = Number(defaultDoctorFeeValue) || 0;

    if (cost < 0) {
      return res.status(400).json({
        success: false,
        message: "Default cost cannot be negative",
      });
    }

    if (defaultDoctorFeeType === "percentage" && feeValue > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor fee percentage cannot exceed 100",
      });
    }

    const operationType =await operationTypeModels.create({
        name: name.trim(),
        specialty,
        description: description?.trim() || null,
        defaultCost: cost,
        defaultDoctorFeeType: defaultDoctorFeeType || "percentage",
        defaultDoctorFeeValue: feeValue,
      });

    const populatedOperationType = await operationTypeModels.findById(operationType._id).populate("specialty", "name");

    return res.status(201).json({
      success: true,
      message:
        "Operation type created successfully",
      operationType: populatedOperationType,
    });
  } catch (error) {
    console.error(
      "CREATE OPERATION TYPE ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Operation type already exists for this specialty",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllOperationTypes = async (req, res) => {
  try {
    const { search, specialty, page = 1, limit = 10} = req.query;
    const filter = {isActive: true};

    if (specialty) filter.specialty = specialty;
    if (search?.trim()) filter.name = { $regex: search.trim(),$options: "i"};

    const pageNumber = Math.max(Number(page) || 1,1 );
    const limitNumber = Math.min( Math.max(Number(limit) || 10, 1),100);

    const skip = (pageNumber - 1) * limitNumber;
    const total = await operationTypeModels.countDocuments(filter);

    const operationTypes =await operationTypeModels.find(filter)
        .populate("specialty", "name")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      operationTypes,
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
      "GET OPERATION TYPES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getSingleOperationType = async (req, res) => {
  try {
    const operationType =
      await operationTypeModels
        .findById(req.params.id)
        .populate("specialty", "name");

    if (!operationType) {
      return res.status(404).json({
        success: false,
        message: "Operation type not found",
      });
    }

    return res.status(200).json({
      success: true,
      operationType,
    });
  } catch (error) {
    console.error(
      "GET OPERATION TYPE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateOperationType = async (req, res) => {
  try {
    const operationType =
      await operationTypeModels.findById(
        req.params.id
      );

    if (!operationType) {
      return res.status(404).json({
        success: false,
        message: "Operation type not found",
      });
    }

    const {
      name,
      specialty,
      description,
      defaultCost,
      defaultDoctorFeeType,
      defaultDoctorFeeValue,
      isActive,
    } = req.body;

    if (name !== undefined) {
      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Operation type name cannot be empty",
        });
      }

      operationType.name = name.trim();
    }

    if (specialty !== undefined) {
      const specialtyExists =
        await specialtyModels.findOne({
          _id: specialty,
          isActive: true,
        });

      if (!specialtyExists) {
        return res.status(400).json({
          success: false,
          message:
            "Specialty not found or inactive",
        });
      }

      operationType.specialty = specialty;
    }

    if (description !== undefined) {
      operationType.description =
        description?.trim() || null;
    }

    if (defaultCost !== undefined) {
      const cost = Number(defaultCost);

      if (Number.isNaN(cost) || cost < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Default cost must be a valid positive number",
        });
      }

      operationType.defaultCost = cost;
    }

    if (defaultDoctorFeeType !== undefined) {
      if (
        !["fixed", "percentage"].includes(
          defaultDoctorFeeType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid doctor fee type",
        });
      }

      operationType.defaultDoctorFeeType =
        defaultDoctorFeeType;
    }

    if (defaultDoctorFeeValue !== undefined) {
      const feeValue = Number(
        defaultDoctorFeeValue
      );

      if (
        Number.isNaN(feeValue) ||
        feeValue < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Doctor fee value must be valid",
        });
      }

      if (
        operationType.defaultDoctorFeeType ===
          "percentage" &&
        feeValue > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Doctor fee percentage cannot exceed 100",
        });
      }

      operationType.defaultDoctorFeeValue =
        feeValue;
    }

    if (isActive !== undefined) {
      operationType.isActive = isActive;
    }

    const duplicate =
      await operationTypeModels.findOne({
        _id: { $ne: operationType._id },
        name: operationType.name,
        specialty: operationType.specialty,
      });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message:
          "Operation type already exists for this specialty",
      });
    }

    await operationType.save();

    const updatedOperationType =
      await operationTypeModels
        .findById(operationType._id)
        .populate("specialty", "name");

    return res.status(200).json({
      success: true,
      message:
        "Operation type updated successfully",
      operationType: updatedOperationType,
    });
  } catch (error) {
    console.error(
      "UPDATE OPERATION TYPE ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Operation type already exists for this specialty",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const deactivateOperationType = async (req, res) => {
  try {
    const operationType =
      await operationTypeModels.findById(
        req.params.id
      );

    if (!operationType) {
      return res.status(404).json({
        success: false,
        message: "Operation type not found",
      });
    }

    operationType.isActive = false;

    await operationType.save();

    return res.status(200).json({
      success: true,
      message:
        "Operation type deactivated successfully",
    });
  } catch (error) {
    console.error(
      "DEACTIVATE OPERATION TYPE ERROR:",
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
  createOperationType,
  getAllOperationTypes,
  getSingleOperationType,
  updateOperationType,
  deactivateOperationType,
};
