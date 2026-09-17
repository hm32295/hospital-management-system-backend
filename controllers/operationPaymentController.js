const mongoose = require("mongoose");

const operationModels = require("../models/operation.model");
const operationPaymentModels = require("../models/operationPayment.model");
const cashDrawerModels = require("../models/cashDrawer.models");
const cashTransactionModels = require("../models/cashTransaction.model");
const doctorModel = require("../models/doctor.model")

const createOperationPayment = async (req, res) => {
 
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { operation, amount, notes ,doctor } = req.body;
    console.log(req.body);
    
    
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
        message: "Payment amount must be greater than zero",
      });
    }

    const existingDoctor = await doctorModel.findById(doctor).session(session);

    if (!existingDoctor) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "doctor not found",
      });
    }
    const existingOperation = await operationModels.findById(operation).session(session);

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
        message: "Cannot pay for a cancelled operation",
      });
    }

    if (existingOperation.remainingAmount <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Operation is already fully paid",
      });
    }

    if (amount > existingOperation.remainingAmount) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed remaining amount (${existingOperation.remainingAmount})`,
      });
    }

    const cashDrawer = await cashDrawerModels.findOne({status: "open",})
      .sort({ openedAt: -1 })
      .session(session);

    if (!cashDrawer) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "There is no open cash drawer",
      });
    }

    const payment = new operationPaymentModels({
      operation: existingOperation._id,
      patient: existingOperation.patient,
      amount,
      receivedBy: req.user._id,
      cashDrawer: cashDrawer._id,
      status: "completed",
      notes: notes || "",
    });

    await payment.save({ session });

    const newPaidAmount = existingOperation.paidAmount + amount;
    const newRemainingAmount =existingOperation.totalAmount - newPaidAmount;

    existingOperation.paidAmount = newPaidAmount;
    existingOperation.remainingAmount = Math.max(newRemainingAmount, 0);

    if (existingOperation.remainingAmount === 0) {
      existingOperation.paymentStatus = "paid";
    } else {
      existingOperation.paymentStatus = "partial";
    }

    await existingOperation.save({ session });

    const cashTransaction = new cashTransactionModels({
      cashDrawer: cashDrawer._id,
      type: "income",
      source: "operation_payment",
      amount,
      operation: existingOperation._id,
      operationPayment: payment._id,
      patient: existingOperation.patient,
      createdBy: req.user._id,
      notes: notes || "",
    });

    await cashTransaction.save({ session });

    cashDrawer.expectedCash += amount;

    await cashDrawer.save({ session });

    await session.commitTransaction();

    const populatedPayment = await operationPaymentModels.findById(payment._id)
      .populate("operation", "operationName totalAmount paidAmount remainingAmount")
      .populate("patient", "name phone")
      .populate("receivedBy", "name")
      .populate("cashDrawer", "openingBalance expectedCash status");

    return res.status(201).json({
      success: true,
      message: "Operation payment created successfully",
      data: populatedPayment,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create operation payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create operation payment",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};




const getOperationPayments = async (req, res) => {
  try {
    const { operationId } = req.params;

    const payments = await operationPaymentModels
      .find({
        operation: operationId,
      })
      .populate("patient", "name phone")
      .populate("receivedBy", "name")
      .populate("cashDrawer", "openingBalance expectedCash status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Get operation payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get operation payments",
      error: error.message,
    });
  }
};

const getSingleOperationPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await operationPaymentModels
      .findById(id)
      .populate("operation", "operationName totalAmount paidAmount remainingAmount")
      .populate("patient", "name phone")
      .populate("receivedBy", "name")
      .populate("cashDrawer", "openingBalance expectedCash status");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Operation payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get single operation payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get operation payment",
      error: error.message,
    });
  }
};

module.exports = {
  createOperationPayment,
  getOperationPayments,
  getSingleOperationPayment,
};