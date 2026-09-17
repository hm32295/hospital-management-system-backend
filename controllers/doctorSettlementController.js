const mongoose = require("mongoose");

const doctorSettlementModels = require("../models/doctorSettlementModel");
const operationModels = require("../models/operation.model");
const cashDrawerModels = require("../models/cashDrawer.models");
const cashTransactionModels = require("../models/cashTransaction.model");

const createDoctorSettlement = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { operation, amount, notes } = req.body;

    if (!operation || !amount) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Operation and amount are required",
      });
    }

    if (amount <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Settlement amount must be greater than zero",
      });
    }

    const existingOperation = await operationModels
      .findById(operation)
      .session(session);

    if (!existingOperation) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    if (existingOperation.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Cannot settle doctor fee for a cancelled operation",
      });
    }

    if (existingOperation.paymentStatus !== "paid") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Operation must be fully paid before doctor settlement",
      });
    }

    if (!existingOperation.doctorFeeAmount || existingOperation.doctorFeeAmount <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "This operation has no doctor fee",
      });
    }

    const previousSettlements = await doctorSettlementModels.aggregate(
      [
        {
          $match: {
            operation: existingOperation._id,
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: {
              $sum: "$amount",
            },
          },
        },
      ],
      { session }
    );

    const paidToDoctor =
      previousSettlements.length > 0
        ? previousSettlements[0].totalPaid
        : 0;

    const doctorRemaining =
      existingOperation.doctorFeeAmount - paidToDoctor;

    if (doctorRemaining <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Doctor fee has already been fully settled",
      });
    }

    if (amount > doctorRemaining) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Settlement amount cannot exceed remaining doctor fee (${doctorRemaining})`,
      });
    }

    const cashDrawer = await cashDrawerModels
      .findOne({
        status: "open",
      })
      .sort({ openedAt: -1 })
      .session(session);

    if (!cashDrawer) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "There is no open cash drawer",
      });
    }

    const doctorSettlement = new doctorSettlementModels({
      doctor: existingOperation.doctor,
      operation: existingOperation._id,
      patient: existingOperation.patient,
      amount,
      paidBy: req.user._id,
      cashDrawer: cashDrawer._id,
      status: "completed",
      notes: notes || "",
    });

    await doctorSettlement.save({ session });

    const cashTransaction = new cashTransactionModels({
      cashDrawer: cashDrawer._id,
      type: "expense",
      source: "doctor_settlement",
      amount,
      operation: existingOperation._id,
      doctor: existingOperation.doctor,
      patient: existingOperation.patient,
      createdBy: req.user._id,
      notes: notes || "",
    });

    await cashTransaction.save({ session });

    cashDrawer.expectedCash -= amount;

    await cashDrawer.save({ session });

    await session.commitTransaction();

    const populatedSettlement = await doctorSettlementModels
      .findById(doctorSettlement._id)
      .populate("doctor", "name")
      .populate(
        "operation",
        "operationName totalAmount doctorFeeAmount"
      )
      .populate("patient", "name phone")
      .populate("paidBy", "name")
      .populate(
        "cashDrawer",
        "openingBalance expectedCash status"
      );

    return res.status(201).json({
      success: true,
      message: "Doctor settlement created successfully",
      data: populatedSettlement,
      financial: {
        doctorFee: existingOperation.doctorFeeAmount,
        paidBefore: paidToDoctor,
        paidNow: amount,
        remaining: doctorRemaining - amount,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create doctor settlement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create doctor settlement",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const getOperationSettlements = async (req, res) => {
  try {
    const { operationId } = req.params;

    const settlements = await doctorSettlementModels
      .find({
        operation: operationId,
      })
      .populate("doctor", "name")
      .populate("patient", "name phone")
      .populate("paidBy", "name")
      .populate(
        "cashDrawer",
        "openingBalance expectedCash status"
      )
      .sort({ createdAt: -1 });

    const totalPaid = settlements
      .filter((item) => item.status === "completed")
      .reduce((total, item) => total + item.amount, 0);

    return res.status(200).json({
      success: true,
      count: settlements.length,
      totalPaid,
      data: settlements,
    });
  } catch (error) {
    console.error("Get operation settlements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get operation settlements",
      error: error.message,
    });
  }
};

const getDoctorSettlements = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const settlements = await doctorSettlementModels
      .find({
        doctor: doctorId,
      })
      .populate(
        "operation",
        "operationName totalAmount doctorFeeAmount"
      )
      .populate("patient", "name phone")
      .populate("paidBy", "name")
      .populate(
        "cashDrawer",
        "openingBalance expectedCash status"
      )
      .sort({ createdAt: -1 });

    const totalPaid = settlements
      .filter((item) => item.status === "completed")
      .reduce((total, item) => total + item.amount, 0);

    return res.status(200).json({
      success: true,
      count: settlements.length,
      totalPaid,
      data: settlements,
    });
  } catch (error) {
    console.error("Get doctor settlements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get doctor settlements",
      error: error.message,
    });
  }
};

const getSingleDoctorSettlement = async (req, res) => {
  try {
    const { id } = req.params;

    const settlement = await doctorSettlementModels
      .findById(id)
      .populate("doctor", "name")
      .populate(
        "operation",
        "operationName totalAmount doctorFeeAmount"
      )
      .populate("patient", "name phone")
      .populate("paidBy", "name")
      .populate(
        "cashDrawer",
        "openingBalance expectedCash status"
      );

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: "Doctor settlement not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    console.error("Get single doctor settlement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get doctor settlement",
      error: error.message,
    });
  }
};

module.exports = {
  createDoctorSettlement,
  getOperationSettlements,
  getDoctorSettlements,
  getSingleDoctorSettlement,
};
// doctorSettlement.route