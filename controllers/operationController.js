const operationModels = require("../models/operation.model");
const patientModels = require("../models/patient.models");
const userModels = require("../models/user.models");
const specialtyModels = require("../models/specialty.model");
const doctorModel = require("../models/doctor.model");

const createOperation = async (req, res) => {
  try {
    const {
      patient,
      doctor,
      specialty,
      operationName,
      operationDate,
      cost,
      discount = 0,
      doctorFeeType = "none",
      doctorFeeValue = 0,
      notes = "",
    } = req.body;

    if (
      !patient ||
      !doctor ||
      !specialty ||
      !operationName ||
      cost === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Patient, doctor, specialty, operation name and cost are required",
      });
    }

    const patientExists = await patientModels.findById(patient);

    if (!patientExists) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const doctorExists = await doctorModel.findById(doctor);


    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const specialtyExists = await specialtyModels.findById(specialty);

    if (!specialtyExists) {
      return res.status(404).json({
        success: false,
        message: "Specialty not found",
      });
    }

    if (Number(cost) < 0) {
      return res.status(400).json({
        success: false,
        message: "Cost cannot be negative",
      });
    }

    if (Number(discount) < 0) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot be negative",
      });
    }

    if (Number(discount) > Number(cost)) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot be greater than cost",
      });
    }

    if (!["none", "fixed", "percentage"].includes(doctorFeeType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor fee type",
      });
    }

    if (Number(doctorFeeValue) < 0) {
      return res.status(400).json({
        success: false,
        message: "Doctor fee cannot be negative",
      });
    }

    if (
      doctorFeeType === "percentage" &&
      Number(doctorFeeValue) > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Doctor fee percentage cannot exceed 100",
      });
    }

    const totalAmount =Number(cost) - Number(discount);

    let doctorFeeAmount = 0;

    if (doctorFeeType === "fixed") {
      doctorFeeAmount = Number(doctorFeeValue);
    }

    if (doctorFeeType === "percentage") {
      doctorFeeAmount =
        (totalAmount * Number(doctorFeeValue)) / 100;
    }

    if (doctorFeeAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor fee cannot be greater than operation amount",
      });
    }

    const hospitalAmount =totalAmount - doctorFeeAmount;

    const operation = await operationModels.create({
      patient,
      doctor,
      specialty,
      operationName,
      operationDate: operationDate || new Date(),
      cost: Number(cost),
      discount: Number(discount),
      totalAmount,
      doctorFeeType,
      doctorFeeValue: Number(doctorFeeValue),
      doctorFeeAmount,
      hospitalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      paymentStatus: "unpaid",
      status: "pending",
      notes,
      createdBy: req.user._id,
    });

    const populatedOperation =
      await operationModels
        .findById(operation._id)
        .populate("patient", "name phone")
        .populate("doctor", "name email role")
        .populate("specialty", "name");

    return res.status(201).json({
      success: true,
      message: "Operation created successfully",
      operation: populatedOperation,
    });
  } catch (error) {
    console.error("CREATE OPERATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllOperations = async (req, res) => {
  try {
    const {
      search,
      patient,
      doctor,
      specialty,
      status,
      paymentStatus,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (patient) filter.patient = patient;
    if (doctor) filter.doctor = doctor;
    if (specialty) filter.specialty = specialty;
    if (status) filter.status = status;
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (search?.trim()) {
      filter.operationName = {
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
      await operationModels.countDocuments(filter);

    const operations =
      await operationModels
        .find(filter)
        .populate("patient", "name phone")
        .populate("doctor", "name email role")
        .populate("specialty", "name")
        .sort({ operationDate: -1 })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      operations,
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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getSingleOperation = async (req, res) => {
  try {
    const operation =
      await operationModels
        .findById(req.params.id)
        .populate("patient", "name phone")
        .populate("doctor", "name email role")
        .populate("specialty", "name")
        .populate("createdBy", "name email");

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    return res.status(200).json({
      success: true,
      operation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
const completeOperation = async (req, res) => {
  try {
    const { id } = req.params;

    const operation = await operationModels.findById(id);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    if (operation.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled operation cannot be completed",
      });
    }

    if (operation.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Operation is already completed",
      });
    }

    operation.status = "completed";

    await operation.save();

    const updatedOperation = await operationModels
      .findById(operation._id)
      .populate("patient", "name phone")
      .populate("doctor", "name")
      .populate("specialty", "name");

    return res.status(200).json({
      success: true,
      message: "Operation completed successfully",
      operation: updatedOperation,
    });
  } catch (error) {
    console.error("COMPLETE OPERATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete operation",
      error: error.message,
    });
  }
};
const updateOperation = async (req, res) => {
  try {
    const operation =
      await operationModels.findById(req.params.id);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    if (operation.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled operation cannot be updated",
      });
    }

    const {
      patient,
      doctor,
      specialty,
      operationName,
      operationDate,
      cost,
      discount,
      doctorFeeType,
      doctorFeeValue,
      status,
      notes,
    } = req.body;

    if (patient !== undefined) {
      const exists =
        await patientModels.findById(patient);

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }

      operation.patient = patient;
    }

    if (doctor !== undefined) {
      const exists =
        await userModels.findById(doctor);

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      operation.doctor = doctor;
    }

    if (specialty !== undefined) {
      const exists =
        await specialtyModels.findById(specialty);

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Specialty not found",
        });
      }

      operation.specialty = specialty;
    }

    if (operationName !== undefined) {
      operation.operationName = operationName;
    }

    if (operationDate !== undefined) {
      const date = new Date(operationDate);

      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid operation date",
        });
      }

      operation.operationDate = date;
    }

    if (cost !== undefined) {
      if (Number(cost) < 0) {
        return res.status(400).json({
          success: false,
          message: "Cost cannot be negative",
        });
      }

      operation.cost = Number(cost);
    }

    if (discount !== undefined) {
      if (Number(discount) < 0) {
        return res.status(400).json({
          success: false,
          message: "Discount cannot be negative",
        });
      }

      operation.discount = Number(discount);
    }

    if (
      operation.discount >
      operation.cost
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot be greater than cost",
      });
    }

    if (doctorFeeType !== undefined) {
      if (
        !["none", "fixed", "percentage"].includes(
          doctorFeeType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid doctor fee type",
        });
      }

      operation.doctorFeeType =
        doctorFeeType;
    }

    if (doctorFeeValue !== undefined) {
      if (Number(doctorFeeValue) < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Doctor fee cannot be negative",
        });
      }

      operation.doctorFeeValue =
        Number(doctorFeeValue);
    }

    const totalAmount =
      operation.cost - operation.discount;

    let doctorFeeAmount = 0;

    if (
      operation.doctorFeeType === "fixed"
    ) {
      doctorFeeAmount =
        operation.doctorFeeValue;
    }

    if (
      operation.doctorFeeType === "percentage"
    ) {
      if (
        operation.doctorFeeValue > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Doctor fee percentage cannot exceed 100",
        });
      }

      doctorFeeAmount =
        (totalAmount *
          operation.doctorFeeValue) /
        100;
    }

    if (
      doctorFeeAmount > totalAmount
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor fee cannot be greater than operation amount",
      });
    }

    operation.totalAmount = totalAmount;
    operation.doctorFeeAmount =
      doctorFeeAmount;
    operation.hospitalAmount =
      totalAmount - doctorFeeAmount;

    operation.remainingAmount =
      Math.max(
        totalAmount -
          operation.paidAmount,
        0
      );

    if (
      operation.paidAmount === 0
    ) {
      operation.paymentStatus = "unpaid";
    } else if (
      operation.paidAmount >=
      totalAmount
    ) {
      operation.paymentStatus = "paid";
      operation.remainingAmount = 0;
    } else {
      operation.paymentStatus = "partial";
    }

    if (status !== undefined) {
      operation.status = status;
    }

    if (notes !== undefined) {
      operation.notes = notes;
    }

    await operation.save();

    const populatedOperation =
      await operationModels
        .findById(operation._id)
        .populate("patient", "name phone")
        .populate("doctor", "name email role")
        .populate("specialty", "name");

    return res.status(200).json({
      success: true,
      message: "Operation updated successfully",
      operation: populatedOperation,
    });
  } catch (error) {
    console.error("UPDATE OPERATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const cancelOperation = async (req, res) => {
  try {
    const operation =
      await operationModels.findById(
        req.params.id
      );

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    if (operation.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Operation with payments cannot be cancelled directly",
      });
    }

    operation.status = "cancelled";

    await operation.save();

    return res.status(200).json({
      success: true,
      message:
        "Operation cancelled successfully",
      operation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createOperation,
  getAllOperations,
  getSingleOperation,
  updateOperation,
  cancelOperation,
  completeOperation
};