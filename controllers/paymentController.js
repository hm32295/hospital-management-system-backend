const mongoose = require("mongoose");

const Payment = require("../models/payment.models");
const Sale = require("../models/sale.models");
const Visit = require("../models/visit.model");
const Operation = require("../models/operation.model");
const Patient = require("../models/patient.models");
const CashDrawer = require("../models/cashDrawer.models");
const CashTransaction = require("../models/cashTransaction.model");

const getOpenCashDrawer = async () => {
  return CashDrawer.findOne({
    status: "open",
  });
}; 

const createPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      sale,
      amount,
      notes = "",
    } = req.body;

    if (!sale || !amount) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Sale and amount are required",
      });
    }

    const paymentAmount = Number(amount);

    if (
      Number.isNaN(paymentAmount) ||
      paymentAmount <= 0
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const existingSale =
      await Sale.findById(sale).session(session);

    if (!existingSale) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    if (existingSale.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Cannot pay a cancelled sale",
      });
    }

    if (
      existingSale.paymentStatus === "paid" ||
      existingSale.remainingAmount <= 0
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Sale is already fully paid",
      });
    }

    if (
      paymentAmount >
      existingSale.remainingAmount
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Payment amount exceeds remaining amount",
      });
    }

    const cashDrawer =
      await getOpenCashDrawer();

    if (!cashDrawer) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "No open cash drawer found",
      });
    }

    const patientId = existingSale.patient;

    if (patientId) {
      const patient =
        await Patient.findById(patientId).session(
          session
        );

      if (!patient) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }
    }

    const oldPaidAmount =
      Number(existingSale.paidAmount || 0);

    const oldRemainingAmount =
      Number(existingSale.remainingAmount || 0);

    const newPaidAmount =
      oldPaidAmount + paymentAmount;

    const newRemainingAmount =
      Math.max(
        0,
        oldRemainingAmount - paymentAmount
      );

    existingSale.paidAmount =
      newPaidAmount;

    existingSale.remainingAmount =
      newRemainingAmount;

    existingSale.paymentStatus =
      newRemainingAmount === 0
        ? "paid"
        : "partial";

    if (
      newRemainingAmount === 0 &&
      existingSale.status !== "completed"
    ) {
      existingSale.status = "completed";
    }

    await existingSale.save({
      session,
    });

    const payment = new Payment({
      type: "sale",
      sale: existingSale._id,
      visit: null,
      operation: null,
      patient: patientId || null,
      amount: paymentAmount,
      receivedBy: req.user._id,
      cashDrawer: cashDrawer._id,
      status: "completed",
      notes,
    });

    await payment.save({
      session,
    });

    const cashTransaction =
      new CashTransaction({
        cashDrawer: cashDrawer._id,
        type: "income",
        source: "sale_payment",
        amount: paymentAmount,
        sale: existingSale._id,
        payment: payment._id,
        patient: patientId || null,
        createdBy: req.user._id,
        notes,
      });

    await cashTransaction.save({
      session,
    });

    cashDrawer.expectedCash =
      Number(cashDrawer.expectedCash || 0) +
      paymentAmount;

    await cashDrawer.save({
      session,
    });

    await session.commitTransaction();

    const populatedPayment =
      await Payment.findById(payment._id)
        .populate(
          "sale",
          "totalAmount paidAmount remainingAmount paymentStatus status"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash actualCash difference status"
        );

    return res.status(201).json({
      success: true,
      message: "Payment created successfully",
      payment: populatedPayment,
      sale: existingSale,
      cashTransaction,
      summary: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus:
          existingSale.paymentStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "CREATE SALE PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create payment",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};
 
const createVisitPayment = async (req,res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { visitId } = req.params;
    const {amount,notes = ""} = req.body;

    if (!amount) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    const paymentAmount = Number(amount);

    if (
      Number.isNaN(paymentAmount) ||
      paymentAmount <= 0
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const visit =
      await Visit.findById(visitId).session(
        session
      );

    if (!visit) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    if (
      visit.paymentStatus === "paid"
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Visit is already paid",
      });
    }

    if (
      paymentAmount !==
      Number(visit.consultationFee)
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Payment amount must equal consultation fee",
      });
    }

    const cashDrawer =
      await getOpenCashDrawer();

    if (!cashDrawer) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "No open cash drawer found",
      });
    }

    const patientId = visit.patient;

    const patient =
      await Patient.findById(patientId).session(
        session
      );

    if (!patient) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    visit.paymentStatus = "paid";

    await visit.save({
      session,
    });

    const payment = new Payment({
      type: "visit",
      sale: null,
      visit: visit._id,
      operation: null,
      patient: patientId,
      amount: paymentAmount,
      receivedBy: req.user._id,
      cashDrawer: cashDrawer._id,
      status: "completed",
      notes,
    });

    await payment.save({
      session,
    });

    const cashTransaction =
      new CashTransaction({
        cashDrawer: cashDrawer._id,
        type: "income",
        source: "visit_payment",
        amount: paymentAmount,
        visit: visit._id,
        payment: payment._id,
        patient: patientId,
        createdBy: req.user._id,
        notes,
      });

    await cashTransaction.save({
      session,
    });

    cashDrawer.expectedCash =
      Number(cashDrawer.expectedCash || 0) +
      paymentAmount;

    await cashDrawer.save({
      session,
    });

    await session.commitTransaction();

    const populatedPayment =
      await Payment.findById(payment._id)
        .populate(
          "visit",
          "patient specialty doctor visitType consultationFee paymentStatus status completedAt"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash actualCash difference status"
        );

    return res.status(201).json({
      success: true,
      message:
        "Visit payment created successfully",
      payment: populatedPayment,
      visit,
      cashTransaction,
      summary: {
        amount: paymentAmount,
        paymentStatus:
          visit.paymentStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "CREATE VISIT PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create visit payment",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const createOperationPayment = async (req,res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { operation, amount, notes = "",} = req.body;

    if (!operation || !amount) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Operation and amount are required",
      });
    }

    const paymentAmount = Number(amount);

    if (
      Number.isNaN(paymentAmount) ||
      paymentAmount <= 0
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const existingOperation =
      await Operation.findById(
        operation
      ).session(session);

    if (!existingOperation) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    if (
      existingOperation.status ===
      "cancelled"
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Cannot pay a cancelled operation",
      });
    }

    const remainingAmount =
      Number(
        existingOperation.remainingAmount || 0
      );

    if (remainingAmount <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Operation is already fully paid",
      });
    }

    if (
      paymentAmount > remainingAmount
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Payment amount exceeds remaining amount",
      });
    }

    const cashDrawer =
      await getOpenCashDrawer();

    if (!cashDrawer) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "No open cash drawer found",
      });
    }

    const patientId =
      existingOperation.patient;

    const patient =
      await Patient.findById(
        patientId
      ).session(session);

    if (!patient) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const oldPaidAmount =
      Number(
        existingOperation.paidAmount || 0
      );

    const newPaidAmount =
      oldPaidAmount + paymentAmount;

    const newRemainingAmount =
      Math.max(
        0,
        remainingAmount - paymentAmount
      );

    existingOperation.paidAmount =
      newPaidAmount;

    existingOperation.remainingAmount =
      newRemainingAmount;

    existingOperation.paymentStatus =
      newRemainingAmount === 0
        ? "paid"
        : "partial";

    await existingOperation.save({
      session,
    });

    const payment = new Payment({
      type: "operation",
      sale: null,
      visit: null,
      operation:
        existingOperation._id,
      patient: patientId,
      amount: paymentAmount,
      receivedBy: req.user._id,
      cashDrawer: cashDrawer._id,
      status: "completed",
      notes,
    });

    await payment.save({
      session,
    });

    const cashTransaction =
      new CashTransaction({
        cashDrawer: cashDrawer._id,
        type: "income",
        source: "operation_payment",
        amount: paymentAmount,
        operation:
          existingOperation._id,
        payment: payment._id,
        patient: patientId,
        doctor:
          existingOperation.doctor || null,
        createdBy: req.user._id,
        notes,
      });

    await cashTransaction.save({
      session,
    });

    cashDrawer.expectedCash =
      Number(cashDrawer.expectedCash || 0) +
      paymentAmount;

    await cashDrawer.save({
      session,
    });

    await session.commitTransaction();

    const populatedPayment =
      await Payment.findById(payment._id)
        .populate(
          "operation",
          "operationName operationDate totalAmount doctorFeeAmount hospitalAmount paidAmount remainingAmount paymentStatus status"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash actualCash difference status"
        );

    return res.status(201).json({
      success: true,
      message:
        "Operation payment created successfully",
      data: populatedPayment,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "CREATE OPERATION PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create operation payment",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const getAllPayments = async ( req, res) => {
  try {
    const { type, sale, visit, operation, patient, status, fromDate, toDate, page = 1, limit = 20} = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (sale) filter.sale = sale;
    if (visit) filter.visit = visit;
    if (operation) {
      filter.operation = operation;
    }
    if (patient) {
      filter.patient = patient;
    }
    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte =
          new Date(fromDate);
      }

      if (toDate) {
        const endDate =
          new Date(toDate);

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte =
          endDate;
      }
    }

    const skip =
      (Number(page) - 1) *
      Number(limit);

    const [
      payments,
      total,
    ] = await Promise.all([
      Payment.find(filter)
        .populate(
          "sale",
          "patient items totalAmount discount paidAmount remainingAmount paymentStatus status createdAt"
        )
        .populate(
          "visit",
          "patient specialty doctor visitType consultationFee paymentStatus status completedAt"
        )
        .populate(
          "operation",
          "patient doctor operationName operationDate totalAmount doctorFeeAmount hospitalAmount paidAmount remainingAmount paymentStatus status"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash actualCash difference status"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(Number(limit)),

      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      payments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(
          total / Number(limit)
        ),
      },
    });
  } catch (error) {
    console.error(
      "GET ALL PAYMENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

const getSinglePayment = async ( req, res) => {
  try {
    const payment =
      await Payment.findById(
        req.params.id
      )
        .populate(
          "sale",
          "patient items totalAmount discount paidAmount remainingAmount paymentStatus status createdAt"
        )
        .populate(
          "visit",
          "patient specialty doctor visitType consultationFee paymentStatus status completedAt"
        )
        .populate(
          "operation",
          "patient doctor operationName operationDate totalAmount doctorFeeAmount hospitalAmount paidAmount remainingAmount paymentStatus status"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash actualCash difference status"
        );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error(
      "GET SINGLE PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
      error: error.message,
    });
  }
};

const getSalePayments = async ( req, res) => {
  try {
    const { saleId } =
      req.params;

    const sale =
      await Sale.findById(
        saleId
      );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    const payments =
      await Payment.find({
        sale: saleId,
      })
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash actualCash difference status"
        )
        .sort({
          createdAt: -1,
        });

    const totalPaid =
      payments.reduce(
        (sum, payment) =>
          sum +
          Number(payment.amount),
        0
      );

    return res.status(200).json({
      success: true,
      sale,
      summary: {
        totalPaid,
        remainingAmount:
          Number(sale.totalAmount || 0) -
          totalPaid,
        paymentStatus:
          sale.paymentStatus,
      },
      payments,
    });
  } catch (error) {
    console.error(
      "GET SALE PAYMENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch sale payments",
      error: error.message,
    });
  }
};

const getVisitPayments = async (req,res) => {
  try {
    const { visitId } =req.params;

    const visit =
      await Visit.findById(
        visitId
      );

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    const payments =
      await Payment.find({
        visit: visitId,
      })
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash actualCash difference status"
        )
        .sort({
          createdAt: -1,
        });

    const totalPaid =
      payments.reduce(
        (sum, payment) =>
          sum +
          Number(payment.amount),
        0
      );

    return res.status(200).json({
      success: true,
      visit,
      summary: {
        totalPaid,
        remainingAmount:
          Math.max(
            0,
            Number(
              visit.consultationFee || 0
            ) - totalPaid
          ),
        paymentStatus:
          visit.paymentStatus,
      },
      payments,
    });
  } catch (error) {
    console.error(
      "GET VISIT PAYMENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch visit payments",
      error: error.message,
    });
  }
};

const getOperationPayments = async (req,res) => {
  try {
    const {
      operationId,
    } = req.params;

    const operation =
      await Operation.findById(
        operationId
      );

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    const payments =
      await Payment.find({
        operation: operationId,
      })
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash actualCash difference status"
        )
        .sort({
          createdAt: -1,
        });

    const totalPaid =
      payments.reduce(
        (sum, payment) =>
          sum +
          Number(payment.amount),
        0
      );

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
      summary: {
        totalPaid,
        remainingAmount:
          Math.max(
            0,
            Number(
              operation.totalAmount || 0
            ) - totalPaid
          ),
        paymentStatus:
          operation.paymentStatus,
      },
    });
  } catch (error) {
    console.error(
      "GET OPERATION PAYMENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch operation payments",
      error: error.message,
    });
  }
};

const getPatientPayments = async (req,res) => {
  try {
    const { patientId } =
      req.params;

    const patient =
      await Patient.findById(
        patientId
      );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const payments =
      await Payment.find({
        patient: patientId,
      })
        .populate(
          "sale",
          "totalAmount paidAmount remainingAmount paymentStatus status createdAt"
        )
        .populate(
          "visit",
          "consultationFee paymentStatus status"
        )
        .populate(
          "operation",
          "operationName totalAmount paidAmount remainingAmount paymentStatus status"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash actualCash difference status"
        )
        .sort({
          createdAt: -1,
        });

    const totalPaid =
      payments.reduce(
        (sum, payment) =>
          sum +
          Number(payment.amount),
        0
      );

    return res.status(200).json({
      success: true,
      patient,
      summary: {
        totalPaid,
        totalPayments:
          payments.length,
      },
      payments,
    });
  } catch (error) {
    console.error(
      "GET PATIENT PAYMENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch patient payments",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  createVisitPayment,
  createOperationPayment,
  getAllPayments,
  getSinglePayment,
  getSalePayments,
  getVisitPayments,
  getOperationPayments,
  getPatientPayments,
};