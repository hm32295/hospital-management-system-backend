
const mongoose = require("mongoose");
const operationModels = require("../models/operation.model");
const patientModels = require("../models/patient.models");
const specialtyModels = require("../models/specialty.model");
const doctorModel = require("../models/doctor.model");
const paymentModels = require("../models/payment.models");
const doctorSettlementModels = require("../models/doctorSettlementModel");

const { ObjectId } = mongoose.Types;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const roundAmount = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getOperationPopulate = (query) =>
  query
    .populate("patient", "name phone")
    .populate("doctor", "name email")
    .populate("specialty", "name");

const validateOperationReferences = async ({ patient, doctor, specialty }) => {
  const [patientExists, doctorExists, specialtyExists] = await Promise.all([
    patientModels.findById(patient),
    doctorModel.findById(doctor),
    specialtyModels.findById(specialty),
  ]);

  return { patientExists, doctorExists, specialtyExists };
};

const calculateOperationFinancials = ({ cost, discount, doctorFeeType, doctorFeeValue }) => {
  const numericCost = Number(cost);
  const numericDiscount = Number(discount);
  const numericDoctorFeeValue = Number(doctorFeeValue);

  if (!Number.isFinite(numericCost) || numericCost < 0) {
    return { error: "invalidCost" };
  }

  if (!Number.isFinite(numericDiscount) || numericDiscount < 0) {
    return { error: "invalidDiscount" };
  }

  if (numericDiscount > numericCost) {
    return { error: "discountGreaterThanCost" };
  }

  if (!["none", "fixed", "percentage"].includes(doctorFeeType)) {
    return { error: "invalidDoctorFeeType" };
  }

  if (!Number.isFinite(numericDoctorFeeValue) || numericDoctorFeeValue < 0) {
    return { error: "invalidDoctorFeeValue" };
  }

  if (doctorFeeType === "percentage" && numericDoctorFeeValue > 100) {
    return { error: "doctorFeePercentageExceeded" };
  }

  const totalAmount = roundAmount(numericCost - numericDiscount);
  let doctorFeeAmount = 0;

  if (doctorFeeType === "fixed") {
    doctorFeeAmount = roundAmount(numericDoctorFeeValue);
  }

  if (doctorFeeType === "percentage") {
    doctorFeeAmount = roundAmount((totalAmount * numericDoctorFeeValue) / 100);
  }

  if (doctorFeeAmount > totalAmount) {
    return { error: "doctorFeeGreaterThanTotal" };
  }

  return {
    cost: roundAmount(numericCost),
    discount: roundAmount(numericDiscount),
    totalAmount,
    doctorFeeType,
    doctorFeeValue: roundAmount(numericDoctorFeeValue),
    doctorFeeAmount,
    hospitalAmount: roundAmount(totalAmount - doctorFeeAmount),
  };
};

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

    if (!patient || !doctor || !specialty || !operationName || cost === undefined) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.requiredFields"),
      });
    }

    if (!isValidId(patient)) {
      return res.status(400).json({ success: false, message: req.t("operations.invalidPatientId") });
    }

    if (!isValidId(doctor)) {
      return res.status(400).json({ success: false, message: req.t("operations.invalidDoctorId") });
    }

    if (!isValidId(specialty)) {
      return res.status(400).json({ success: false, message: req.t("operations.invalidSpecialtyId") });
    }

    if (typeof operationName !== "string" || !operationName.trim()) {
      return res.status(400).json({ success: false, message: req.t("operations.invalidOperationName") });
    }

    if (notes !== undefined && typeof notes !== "string") {
      return res.status(400).json({ success: false, message: req.t("operations.invalidNotes") });
    }

    let parsedDate = new Date();

    if (operationDate !== undefined) {
      parsedDate = new Date(operationDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidOperationDate"),
        });
      }
    }

    const { patientExists, doctorExists, specialtyExists } =
      await validateOperationReferences({ patient, doctor, specialty });

    if (!patientExists) {
      return res.status(404).json({ success: false, message: req.t("operations.patientNotFound") });
    }

    if (!doctorExists) {
      return res.status(404).json({ success: false, message: req.t("operations.doctorNotFound") });
    }

    if (!doctorExists.isActive) {
      return res.status(400).json({ success: false, message: req.t("operations.doctorInactive") });
    }

    if (!specialtyExists) {
      return res.status(404).json({ success: false, message: req.t("operations.specialtyNotFound") });
    }

    if (!specialtyExists.isActive) {
      return res.status(400).json({ success: false, message: req.t("operations.specialtyInactive") });
    }

    const hasSpecialty = doctorExists.specialties.some(
      (item) => item.toString() === specialty.toString()
    );

    if (!hasSpecialty) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.doctorSpecialtyMismatch"),
      });
    }

    const financials = calculateOperationFinancials({
      cost,
      discount,
      doctorFeeType,
      doctorFeeValue,
    });

    if (financials.error) {
      return res.status(400).json({
        success: false,
        message: req.t(`operations.${financials.error}`),
      });
    }

    const operation = await operationModels.create({
      patient,
      doctor,
      specialty,
      operationName: operationName.trim(),
      operationDate: parsedDate,
      cost: financials.cost,
      discount: financials.discount,
      totalAmount: financials.totalAmount,
      doctorFeeType: financials.doctorFeeType,
      doctorFeeValue: financials.doctorFeeValue,
      doctorFeeAmount: financials.doctorFeeAmount,
      hospitalAmount: financials.hospitalAmount,
      paidAmount: 0,
      remainingAmount: financials.totalAmount,
      paymentStatus: "unpaid",
      status: "pending",
      notes: notes.trim(),
      createdBy: req.user._id,
    });

    const populatedOperation = await getOperationPopulate(
      operationModels.findById(operation._id)
    );

    return res.status(201).json({
      success: true,
      message: req.t("operations.createdSuccessfully"),
      operation: populatedOperation,
    });
  } catch (error) {
    console.error("CREATE OPERATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: req.t("operations.createFailed"),
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


    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.invalidPage"),
      });
    }


    if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.invalidLimit"),
      });
    }

    const filter = {};
    if (patient !== undefined && patient !== "") {
    
      if (!isValidId(patient)) {
        return res.status(400).json({ success: false, message: req.t("operations.invalidPatientId") });
      }
      filter.patient = patient;
    }
    if (doctor !== undefined && doctor !== "") {
      if (!isValidId(doctor)) {
        return res.status(400).json({ success: false, message: req.t("operations.invalidDoctorId") });
      }
      filter.doctor = doctor;
    }

    if (specialty !== undefined && specialty !== "") {
      if (!isValidId(specialty)) {
        return res.status(400).json({ success: false, message: req.t("operations.invalidSpecialtyId") });
      }
      filter.specialty = specialty;
    }

    if (status !== undefined && status !== "") {
      if (!["pending", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ success: false, message: req.t("operations.invalidStatus") });
      }
      filter.status = status;
    }

    if (paymentStatus !== undefined && paymentStatus !== "") {
      if (!["unpaid", "partial", "paid"].includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidPaymentStatus"),
        });
      }
      filter.paymentStatus = paymentStatus;
    }

    if (search !== undefined && search !== "") {
      if (typeof search !== "string") {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidSearch"),
        });
      }

      if (search.trim()) {
        filter.operationName = {
          $regex: search.trim(),
          $options: "i",
        };
      }
    }

    const skip = (pageNumber - 1) * limitNumber;
    

    const [total, operations] = await Promise.all([
      operationModels.countDocuments(filter),
      getOperationPopulate(
        operationModels
          .find(filter)
          .sort({ operationDate: -1 })
          .skip(skip)
          .limit(limitNumber)
      ),
    ]);

    return res.status(200).json({
      success: true,
      operations,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("GET ALL OPERATIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: req.t("operations.fetchFailed"),
    });
  }
};

const getSingleOperation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.invalidId"),
      });
    }

    const operation = await getOperationPopulate(
      operationModels
        .findById(id)
        .populate("createdBy", "name email")
    );

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: req.t("operations.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      operation,
    });
  } catch (error) {
    console.error("GET SINGLE OPERATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: req.t("operations.fetchFailed"),
    });
  }
};

const completeOperation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.invalidId"),
      });
    }

    const operation = await operationModels.findById(id);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: req.t("operations.notFound"),
      });
    }

    if (operation.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: req.t("operations.cancelledCannotComplete"),
      });
    }

    if (operation.status === "completed") {
      return res.status(400).json({
        success: false,
        message: req.t("operations.alreadyCompleted"),
      });
    }

    operation.status = "completed";
    await operation.save();

    const updatedOperation = await getOperationPopulate(
      operationModels.findById(operation._id)
    );

    return res.status(200).json({
      success: true,
      message: req.t("operations.completedSuccessfully"),
      operation: updatedOperation,
    });
  } catch (error) {
    console.error("COMPLETE OPERATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: req.t("operations.completeFailed"),
    });
  }
};

const updateOperation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.invalidId"),
      });
    }

    const operation = await operationModels.findById(id);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: req.t("operations.notFound"),
      });
    }

    if (operation.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: req.t("operations.cancelledCannotUpdate"),
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

    const [paymentExists, settlementExists] = await Promise.all([
      paymentModels.exists({
        operation: operation._id,
        status: "completed",
      }),
      doctorSettlementModels.exists({
        operation: operation._id,
        status: "completed",
      }),
    ]);

    if (
      settlementExists &&
      (doctor !== undefined ||
        cost !== undefined ||
        discount !== undefined ||
        doctorFeeType !== undefined ||
        doctorFeeValue !== undefined)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.financialDataLocked"),
      });
    }

    if (patient !== undefined) {
      if (!isValidId(patient)) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidPatientId"),
        });
      }

      const exists = await patientModels.findById(patient);

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: req.t("operations.patientNotFound"),
        });
      }

      operation.patient = patient;
    }

    if (doctor !== undefined) {
      if (!isValidId(doctor)) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidDoctorId"),
        });
      }

      const exists = await doctorModel.findById(doctor);

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: req.t("operations.doctorNotFound"),
        });
      }

      if (!exists.isActive) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.doctorInactive"),
        });
      }

      operation.doctor = doctor;
    }

    if (specialty !== undefined) {
      if (!isValidId(specialty)) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidSpecialtyId"),
        });
      }

      const exists = await specialtyModels.findById(specialty);

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: req.t("operations.specialtyNotFound"),
        });
      }

      if (!exists.isActive) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.specialtyInactive"),
        });
      }

      operation.specialty = specialty;
    }

    const doctorExists = await doctorModel.findById(operation.doctor);

    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: req.t("operations.doctorNotFound"),
      });
    }

    if (!doctorExists.isActive) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.doctorInactive"),
      });
    }

    const specialtyExists = await specialtyModels.findById(operation.specialty);

    if (!specialtyExists) {
      return res.status(404).json({
        success: false,
        message: req.t("operations.specialtyNotFound"),
      });
    }

    if (!specialtyExists.isActive) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.specialtyInactive"),
      });
    }

    if (
      !doctorExists.specialties.some(
        (item) => item.toString() === operation.specialty.toString()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.doctorSpecialtyMismatch"),
      });
    }

    if (operationName !== undefined) {
      if (typeof operationName !== "string" || !operationName.trim()) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidOperationName"),
        });
      }

      operation.operationName = operationName.trim();
    }

    if (operationDate !== undefined) {
      const date = new Date(operationDate);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidOperationDate"),
        });
      }

      operation.operationDate = date;
    }

    const nextCost = cost !== undefined ? cost : operation.cost;
    const nextDiscount = discount !== undefined ? discount : operation.discount;
    const nextDoctorFeeType =
      doctorFeeType !== undefined ? doctorFeeType : operation.doctorFeeType;
    const nextDoctorFeeValue =
      doctorFeeValue !== undefined ? doctorFeeValue : operation.doctorFeeValue;

    const financials = calculateOperationFinancials({
      cost: nextCost,
      discount: nextDiscount,
      doctorFeeType: nextDoctorFeeType,
      doctorFeeValue: nextDoctorFeeValue,
    });

    if (financials.error) {
      return res.status(400).json({
        success: false,
        message: req.t(`operations.${financials.error}`),
      });
    }

    if (
      paymentExists &&
      financials.totalAmount < Number(operation.paidAmount || 0)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.totalLessThanPaid"),
        paidAmount: operation.paidAmount,
        newTotalAmount: financials.totalAmount,
      });
    }

    operation.cost = financials.cost;
    operation.discount = financials.discount;
    operation.totalAmount = financials.totalAmount;
    operation.doctorFeeType = financials.doctorFeeType;
    operation.doctorFeeValue = financials.doctorFeeValue;
    operation.doctorFeeAmount = financials.doctorFeeAmount;
    operation.hospitalAmount = financials.hospitalAmount;

    operation.remainingAmount = roundAmount(
      Math.max(
        financials.totalAmount - Number(operation.paidAmount || 0),
        0
      )
    );

    if (Number(operation.paidAmount || 0) === 0) {
      operation.paymentStatus = "unpaid";
    } else if (Number(operation.paidAmount) >= financials.totalAmount) {
      operation.paymentStatus = "paid";
      operation.remainingAmount = 0;
    } else {
      operation.paymentStatus = "partial";
    }

    if (status !== undefined) {
      if (!["pending", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidStatus"),
        });
      }

      if (
        status === "cancelled" &&
        Number(operation.paidAmount || 0) > 0
      ) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.hasPaymentsCannotCancel"),
        });
      }

      if (
        operation.status === "completed" &&
        status === "pending"
      ) {
        return res.status(400).json({
          success: false,
          message: req.t("operations.completedCannotReturnPending"),
        });
      }

      operation.status = status;
    }

    if (notes !== undefined) {
      if (typeof notes !== "string") {
        return res.status(400).json({
          success: false,
          message: req.t("operations.invalidNotes"),
        });
      }

      operation.notes = notes.trim();
    }

    await operation.save();

    const populatedOperation = await getOperationPopulate(
      operationModels.findById(operation._id)
    );

    return res.status(200).json({
      success: true,
      message: req.t("operations.updatedSuccessfully"),
      operation: populatedOperation,
    });
  } catch (error) {
    console.error("UPDATE OPERATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: req.t("operations.updateFailed"),
    });
  }
};

const cancelOperation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.invalidId"),
      });
    }

    const operation = await operationModels.findById(id);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: req.t("operations.notFound"),
      });
    }

    if (operation.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: req.t("operations.alreadyCancelled"),
      });
    }

    if (Number(operation.paidAmount || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: req.t("operations.hasPaymentsCannotCancel"),
      });
    }

    operation.status = "cancelled";
    operation.remainingAmount = 0;
    operation.paymentStatus = "unpaid";

    await operation.save();

    return res.status(200).json({
      success: true,
      message: req.t("operations.cancelledSuccessfully"),
      operation,
    });
  } catch (error) {
    console.error("CANCEL OPERATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: req.t("operations.cancelFailed"),
    });
  }
};

module.exports = {
  createOperation,
  getAllOperations,
  getSingleOperation,
  updateOperation,
  cancelOperation,
  completeOperation,
};

