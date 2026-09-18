const mongoose = require("mongoose");

const Payment = require("../models/payment.models");
const Sale = require("../models/sale.models");
const Visit = require("../models/visit.model");
const Operation = require("../models/operation.model");
const Patient = require("../models/patient.models");
const CashDrawer = require("../models/cashDrawer.models");
const CashTransaction = require("../models/cashTransaction.model");

const getOpenCashDrawer = async (session = null) => {
  const query = CashDrawer.findOne({
    status: "open",
  });

  if (session) {
    query.session(session);
  }

  return query;
};

const getCompletedPaymentsTotal = async (
  filter,
  session = null
) => {
  const query = Payment.aggregate([
    {
      $match: {
        ...filter,
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
  ]);

  if (session) {
    query.session(session);
  }

  const result = await query;

  return result.length > 0
    ? Number(result[0].totalPaid || 0)
    : 0;
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

    if (!sale || amount === undefined) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Sale and amount are required",
      });
    }

    const paymentAmount = Number(amount);

    if (
      !Number.isFinite(paymentAmount) ||
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

    const totalAmount =
      Number(existingSale.totalAmount || 0);

    const totalPaid =
      await getCompletedPaymentsTotal(
        {
          sale: existingSale._id,
        },
        session
      );

    const remainingAmount =
      Math.max(totalAmount - totalPaid, 0);

    if (remainingAmount <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Sale is already fully paid",
      });
    }

    if (paymentAmount > remainingAmount) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Payment amount exceeds remaining amount",
        remainingAmount,
      });
    }

    const cashDrawer =
      await getOpenCashDrawer(session);

    if (!cashDrawer) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "No open cash drawer found",
      });
    }

    const patientId =
      existingSale.patient || null;

    if (patientId) {
      const patient =
        await Patient.findById(patientId)
          .session(session);

      if (!patient) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }
    }

    const newPaidAmount =
      totalPaid + paymentAmount;

    const newRemainingAmount =
      Math.max(
        totalAmount - newPaidAmount,
        0
      );

    existingSale.paidAmount =
      newPaidAmount;

    existingSale.remainingAmount =
      newRemainingAmount;

    existingSale.paymentStatus =
      newRemainingAmount === 0
        ? "paid"
        : "partial";

    if (newRemainingAmount === 0) {
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
        source: "sale_payment",
        amount: paymentAmount,
        sale: existingSale._id,
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
          "sale",
          "patient items totalAmount discount paidAmount remainingAmount paymentStatus status createdAt"
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
        totalAmount,
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
    await session.endSession();
  }
};

const createVisitPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { visitId } = req.params;
    const {
      amount,
      notes = "",
    } = req.body;

    if (amount === undefined) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    const paymentAmount = Number(amount);

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const visit =
      await Visit.findById(visitId)
        .session(session);

    if (!visit) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    if (visit.status === "cancelled") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Cannot pay a cancelled visit",
      });
    }

    const consultationFee =
      Number(visit.consultationFee || 0);

    const totalPaid =
      await getCompletedPaymentsTotal(
        {
          visit: visit._id,
        },
        session
      );

    const remainingAmount =
      Math.max(
        consultationFee - totalPaid,
        0
      );

    if (remainingAmount <= 0) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Visit is already fully paid",
      });
    }

    if (paymentAmount !== remainingAmount) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Payment amount must equal remaining visit amount",
        remainingAmount,
      });
    }

    const cashDrawer =
      await getOpenCashDrawer(session);

    if (!cashDrawer) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "No open cash drawer found",
      });
    }

    const patientId = visit.patient;

    const patient =
      await Patient.findById(patientId)
        .session(session);

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
        totalPaid:
          totalPaid + paymentAmount,
        remainingAmount: 0,
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
    await session.endSession();
  }
};

const createOperationPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      operation,
      amount,
      notes = "",
    } = req.body;

    if (
      !operation ||
      amount === undefined
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Operation and amount are required",
      });
    }

    const paymentAmount = Number(amount);

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const existingOperation =
      await Operation.findById(operation)
        .session(session);

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

    const totalAmount =
      Number(
        existingOperation.totalAmount || 0
      );

    const totalPaid =
      await getCompletedPaymentsTotal(
        {
          operation:
            existingOperation._id,
        },
        session
      );

    const remainingAmount =
      Math.max(
        totalAmount - totalPaid,
        0
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
      paymentAmount >
      remainingAmount
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Payment amount exceeds remaining amount",
        remainingAmount,
      });
    }

    const cashDrawer =
      await getOpenCashDrawer(session);

    if (!cashDrawer) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "No open cash drawer found",
      });
    }

    const patientId =
      existingOperation.patient;

    const patient =
      await Patient.findById(patientId)
        .session(session);

    if (!patient) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const newPaidAmount =
      totalPaid + paymentAmount;

    const newRemainingAmount =
      Math.max(
        totalAmount - newPaidAmount,
        0
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
      Number(
        cashDrawer.expectedCash || 0
      ) + paymentAmount;

    await cashDrawer.save({
      session,
    });

    await session.commitTransaction();

    const populatedPayment =
      await Payment.findById(payment._id)
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

    return res.status(201).json({
      success: true,
      message:
        "Operation payment created successfully",
      data: populatedPayment,
      summary: {
        totalAmount,
        paidAmount: newPaidAmount,
        remainingAmount:
          newRemainingAmount,
        paymentStatus:
          existingOperation.paymentStatus,
      },
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
    await session.endSession();
  }
};

const getAllPayments = async (req, res) => {
  try {
    const {
      type,
      sale,
      visit,
      operation,
      patient,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (sale) filter.sale = sale;
    if (visit) filter.visit = visit;
    if (operation) filter.operation = operation;
    if (patient) filter.patient = patient;
    if (status) filter.status = status;

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte =
          new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);

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

    const pageNumber =
      Math.max(Number(page) || 1, 1);

    const limitNumber =
      Math.max(Number(limit) || 20, 1);

    const skip =
      (pageNumber - 1) *
      limitNumber;

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
        .limit(limitNumber),

      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      payments,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages:
          Math.ceil(
            total / limitNumber
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

const getSinglePayment = async (req, res) => {
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

const getSalePayments = async (req, res) => {
  try {
    const { saleId } = req.params;

    const sale =
      await Sale.findById(saleId);

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

    const completedPayments =
      payments.filter(
        (payment) =>
          payment.status === "completed"
      );

    const totalPaid =
      completedPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const remainingAmount =
      Math.max(
        Number(sale.totalAmount || 0) -
          totalPaid,
        0
      );

    return res.status(200).json({
      success: true,
      sale,
      summary: {
        totalAmount:
          Number(sale.totalAmount || 0),
        totalPaid,
        remainingAmount,
        paymentStatus:
          remainingAmount === 0
            ? "paid"
            : totalPaid > 0
            ? "partial"
            : "unpaid",
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

const getVisitPayments = async (req, res) => {
  try {
    const { visitId } = req.params;

    const visit =
      await Visit.findById(visitId);

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

    const completedPayments =
      payments.filter(
        (payment) =>
          payment.status === "completed"
      );

    const totalPaid =
      completedPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const remainingAmount =
      Math.max(
        Number(visit.consultationFee || 0) -
          totalPaid,
        0
      );

    return res.status(200).json({
      success: true,
      visit,
      summary: {
        totalAmount:
          Number(
            visit.consultationFee || 0
          ),
        totalPaid,
        remainingAmount,
        paymentStatus:
          remainingAmount === 0
            ? "paid"
            : totalPaid > 0
            ? "partial"
            : "unpaid",
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

const getOperationPayments = async (
  req,
  res
) => {
  try {
    const { operationId } = req.params;

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

    const completedPayments =
      payments.filter(
        (payment) =>
          payment.status === "completed"
      );

    const totalPaid =
      completedPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const totalAmount =
      Number(operation.totalAmount || 0);

    const remainingAmount =
      Math.max(
        totalAmount - totalPaid,
        0
      );

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
      summary: {
        totalAmount,
        totalPaid,
        remainingAmount,
        paymentStatus:
          remainingAmount === 0
            ? "paid"
            : totalPaid > 0
            ? "partial"
            : "unpaid",
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

const getPatientPayments = async (
  req,
  res
) => {
  try {
    const { patientId } = req.params;

    const patient =
      await Patient.findById(patientId);

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

    const completedPayments =
      payments.filter(
        (payment) =>
          payment.status === "completed"
      );

    const totalPaid =
      completedPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    return res.status(200).json({
      success: true,
      patient,
      summary: {
        totalPaid,
        totalPayments:
          payments.length,
        completedPayments:
          completedPayments.length,
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