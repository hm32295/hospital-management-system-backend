const mongoose = require("mongoose");
const Payment = require("../models/payment.models");
const Sale = require("../models/sale.models");
const Visit = require("../models/visit.model");
const Operation = require("../models/operation.model");
const Patient = require("../models/patient.models");
const CashDrawer = require("../models/cashDrawer.models");
const CashTransaction = require("../models/cashTransaction.model");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const getPagination = (page, limit) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return { pageNumber, limitNumber, skip: (pageNumber - 1) * limitNumber };
};

const getOpenCashDrawer = async (session = null) => {
  const query = CashDrawer.findOne({ status: "open" });
  if (session) query.session(session);
  return query;
};

const getCompletedPaymentsTotal = async (filter, session = null) => {
  const query = Payment.aggregate([
    { $match: { ...filter, status: "completed" } },
    { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
  ]);

  if (session) query.session(session);

  const result = await query;
  return Number(result[0]?.totalPaid || 0);
};

const validatePaymentAmount = (amount, req) => {
  if (amount === undefined || amount === null) {
    return { valid: false, message: req.t("payments.amountRequired") };
  }

  const paymentAmount = Number(amount);

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return { valid: false, message: req.t("payments.invalidAmount") };
  }

  return { valid: true, value: paymentAmount };
};

const validateNotes = (notes, req) => {
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return { valid: false, message: req.t("payments.invalidNotes") };
  }

  return { valid: true };
};

const createPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { sale, amount, notes = "" } = req.body;

    if (!sale) {
      return res.status(400).json({
        success: false,
        message: req.t("payments.saleRequired"),
      });
    }

    if (!isValidId(sale)) {
      return res.status(400).json({
        success: false,
        message: req.t("payments.invalidSaleId"),
      });
    }

    const amountResult = validatePaymentAmount(amount, req);

    if (!amountResult.valid) {
      return res.status(400).json({
        success: false,
        message: amountResult.message,
      });
    }

    const notesResult = validateNotes(notes, req);

    if (!notesResult.valid) {
      return res.status(400).json({
        success: false,
        message: notesResult.message,
      });
    }

    const paymentAmount = amountResult.value;

    session.startTransaction();

    const existingSale = await Sale.findById(sale).session(session);

    if (!existingSale) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: req.t("payments.saleNotFound"),
      });
    }

    if (existingSale.status === "cancelled") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.cancelledSale"),
      });
    }

    const totalAmount = Number(existingSale.totalAmount || 0);

    const totalPaid = await getCompletedPaymentsTotal({ sale: existingSale._id }, session);

    const remainingAmount = Math.max(totalAmount - totalPaid, 0);

    if (remainingAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.saleAlreadyPaid"),
      });
    }

    if (paymentAmount > remainingAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.amountExceedsRemaining"),
        remainingAmount,
      });
    }

    const cashDrawer = await getOpenCashDrawer(session);

    if (!cashDrawer) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.noOpenCashDrawer"),
      });
    }

    const patientId = existingSale.patient || null;

    if (patientId) {
      const patient = await Patient.findById(patientId).session(session);

      if (!patient) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: req.t("payments.patientNotFound"),
        });
      }
    }

    const newPaidAmount = totalPaid + paymentAmount;
    const newRemainingAmount = Math.max(totalAmount - newPaidAmount, 0);

    existingSale.paidAmount = newPaidAmount;
    existingSale.remainingAmount = newRemainingAmount;
    existingSale.paymentStatus = newRemainingAmount === 0 ? "paid" : "partial";

    if (newRemainingAmount === 0) {
      existingSale.status = "completed";
    }

    await existingSale.save({ session });

    const payment = await Payment.create([{
      type: "sale",
      sale: existingSale._id,
      visit: null,
      operation: null,
      patient: patientId,
      amount: paymentAmount,
      receivedBy: req.user._id,
      cashDrawer: cashDrawer._id,
      status: "completed",
      notes: notes?.trim() || "",
    }], { session });

    const cashTransaction = await CashTransaction.create([{
      cashDrawer: cashDrawer._id,
      type: "income",
      source: "sale_payment",
      amount: paymentAmount,
      sale: existingSale._id,
      payment: payment[0]._id,
      patient: patientId,
      createdBy: req.user._id,
      notes: notes?.trim() || "",
    }], { session });

    cashDrawer.expectedCash = Number(cashDrawer.expectedCash || 0) + paymentAmount;

    await cashDrawer.save({ session });

    await session.commitTransaction();

    const populatedPayment = await Payment.findById(payment[0]._id)
      .populate("sale", "patient items totalAmount discount paidAmount remainingAmount paymentStatus status createdAt")
      .populate("patient", "name phone")
      .populate("receivedBy", "name email role")
      .populate("cashDrawer", "openingBalance expectedCash actualCash difference status");

    return res.status(201).json({
      success: true,
      message: req.t("payments.createdSuccessfully"),
      payment: populatedPayment,
      sale: existingSale,
      cashTransaction: cashTransaction[0],
      summary: {
        totalAmount,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: existingSale.paymentStatus,
      },
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();

    console.error("Create sale payment error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  } finally {
    await session.endSession();
  }
};

const createVisitPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { visitId } = req.params;
    const { amount, notes = "" } = req.body;

    if (!isValidId(visitId)) {
      return res.status(400).json({
        success: false,
        message: req.t("payments.invalidVisitId"),
      });
    }

    const amountResult = validatePaymentAmount(amount, req);

    if (!amountResult.valid) {
      return res.status(400).json({
        success: false,
        message: amountResult.message,
      });
    }

    const notesResult = validateNotes(notes, req);

    if (!notesResult.valid) {
      return res.status(400).json({
        success: false,
        message: notesResult.message,
      });
    }

    const paymentAmount = amountResult.value;

    session.startTransaction();

    const visit = await Visit.findById(visitId).session(session);

    if (!visit) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: req.t("payments.visitNotFound"),
      });
    }

    if (visit.status === "cancelled") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.cancelledVisit"),
      });
    }

    if (visit.paymentStatus === "paid") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.visitAlreadyPaid"),
      });
    }

    const consultationFee = Number(visit.consultationFee || 0);

    const totalPaid = await getCompletedPaymentsTotal({ visit: visit._id }, session);

    const remainingAmount = Math.max(consultationFee - totalPaid, 0);

    if (remainingAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.visitAlreadyPaid"),
      });
    }

    if (paymentAmount !== remainingAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.visitAmountMustEqualRemaining"),
        remainingAmount,
      });
    }

    const cashDrawer = await getOpenCashDrawer(session);

    if (!cashDrawer) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.noOpenCashDrawer"),
      });
    }

    if (!visit.patient || !isValidId(visit.patient)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.invalidPatientId"),
      });
    }

    const patient = await Patient.findById(visit.patient).session(session);

    if (!patient) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: req.t("payments.patientNotFound"),
      });
    }

    visit.paymentStatus = "paid";

    await visit.save({ session });

    const payment = await Payment.create([{
      type: "visit",
      sale: null,
      visit: visit._id,
      operation: null,
      patient: patient._id,
      amount: paymentAmount,
      receivedBy: req.user._id,
      cashDrawer: cashDrawer._id,
      status: "completed",
      notes: notes?.trim() || "",
    }], { session });

    const cashTransaction = await CashTransaction.create([{
      cashDrawer: cashDrawer._id,
      type: "income",
      source: "visit_payment",
      amount: paymentAmount,
      visit: visit._id,
      payment: payment[0]._id,
      patient: patient._id,
      createdBy: req.user._id,
      notes: notes?.trim() || "",
    }], { session });

    cashDrawer.expectedCash = Number(cashDrawer.expectedCash || 0) + paymentAmount;

    await cashDrawer.save({ session });

    await session.commitTransaction();

    const populatedPayment = await Payment.findById(payment[0]._id)
      .populate("visit", "patient specialty doctor visitType consultationFee paymentStatus status completedAt")
      .populate("patient", "name phone")
      .populate("receivedBy", "name email role")
      .populate("cashDrawer", "openingBalance expectedCash actualCash difference status");

    return res.status(201).json({
      success: true,
      message: req.t("payments.visitCreatedSuccessfully"),
      payment: populatedPayment,
      visit,
      cashTransaction: cashTransaction[0],
      summary: {
        amount: paymentAmount,
        totalPaid: totalPaid + paymentAmount,
        remainingAmount: 0,
        paymentStatus: visit.paymentStatus,
      },
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();

    console.error("Create visit payment error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  } finally {
    await session.endSession();
  }
};

const createOperationPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { operation, amount, notes = "" } = req.body;

    if (!operation) {
      return res.status(400).json({
        success: false,
        message: req.t("payments.operationRequired"),
      });
    }

    if (!isValidId(operation)) {
      return res.status(400).json({
        success: false,
        message: req.t("payments.invalidOperationId"),
      });
    }

    const amountResult = validatePaymentAmount(amount, req);

    if (!amountResult.valid) {
      return res.status(400).json({
        success: false,
        message: amountResult.message,
      });
    }

    const notesResult = validateNotes(notes, req);

    if (!notesResult.valid) {
      return res.status(400).json({
        success: false,
        message: notesResult.message,
      });
    }

    const paymentAmount = amountResult.value;

    session.startTransaction();

    const existingOperation = await Operation.findById(operation).session(session);

    if (!existingOperation) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: req.t("payments.operationNotFound"),
      });
    }

    if (existingOperation.status === "cancelled") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.cancelledOperation"),
      });
    }

    const totalAmount = Number(existingOperation.totalAmount || 0);

    const totalPaid = await getCompletedPaymentsTotal({ operation: existingOperation._id }, session);

    const remainingAmount = Math.max(totalAmount - totalPaid, 0);

    if (remainingAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.operationAlreadyPaid"),
      });
    }

    if (paymentAmount > remainingAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.amountExceedsRemaining"),
        remainingAmount,
      });
    }

    const cashDrawer = await getOpenCashDrawer(session);

    if (!cashDrawer) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.noOpenCashDrawer"),
      });
    }

    if (!existingOperation.patient || !isValidId(existingOperation.patient)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("payments.invalidPatientId"),
      });
    }

    const patient = await Patient.findById(existingOperation.patient).session(session);

    if (!patient) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: req.t("payments.patientNotFound"),
      });
    }

    const newPaidAmount = totalPaid + paymentAmount;
    const newRemainingAmount = Math.max(totalAmount - newPaidAmount, 0);

    existingOperation.paidAmount = newPaidAmount;
    existingOperation.remainingAmount = newRemainingAmount;
    existingOperation.paymentStatus = newRemainingAmount === 0 ? "paid" : "partial";

    await existingOperation.save({ session });

    const payment = await Payment.create([{
      type: "operation",
      sale: null,
      visit: null,
      operation: existingOperation._id,
      patient: patient._id,
      amount: paymentAmount,
      receivedBy: req.user._id,
      cashDrawer: cashDrawer._id,
      status: "completed",
      notes: notes?.trim() || "",
    }], { session });

    const cashTransaction = await CashTransaction.create([{
      cashDrawer: cashDrawer._id,
      type: "income",
      source: "operation_payment",
      amount: paymentAmount,
      operation: existingOperation._id,
      payment: payment[0]._id,
      patient: patient._id,
      doctor: existingOperation.doctor || null,
      createdBy: req.user._id,
      notes: notes?.trim() || "",
    }], { session });

    cashDrawer.expectedCash = Number(cashDrawer.expectedCash || 0) + paymentAmount;

    await cashDrawer.save({ session });

    await session.commitTransaction();

    const populatedPayment = await Payment.findById(payment[0]._id)
      .populate("operation", "patient doctor operationName operationDate totalAmount doctorFeeAmount hospitalAmount paidAmount remainingAmount paymentStatus status")
      .populate("patient", "name phone")
      .populate("receivedBy", "name email role")
      .populate("cashDrawer", "openingBalance expectedCash actualCash difference status");

    return res.status(201).json({
      success: true,
      message: req.t("payments.operationCreatedSuccessfully"),
      data: populatedPayment,
      summary: {
        totalAmount,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: existingOperation.paymentStatus,
      },
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();

    console.error("Create operation payment error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  } finally {
    await session.endSession();
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { type, sale, visit, operation, patient, status, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (type) {
      if (!["sale", "visit", "operation"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: req.t("payments.invalidType"),
        });
      }

      filter.type = type;
    }

    const idFilters = [
      ["sale", sale, "invalidSaleId"],
      ["visit", visit, "invalidVisitId"],
      ["operation", operation, "invalidOperationId"],
      ["patient", patient, "invalidPatientId"],
    ];

    for (const [field, value, translationKey] of idFilters) {
      if (value) {
        if (!isValidId(value)) {
          return res.status(400).json({
            success: false,
            message: req.t(`payments.${translationKey}`),
          });
        }

        filter[field] = value;
      }
    }

    if (status) {
      if (!["completed", "cancelled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: req.t("payments.invalidStatus"),
        });
      }

      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: req.t("payments.invalidFromDate"),
          });
        }

        filter.createdAt.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: req.t("payments.invalidToDate"),
          });
        }

        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }

      if (filter.createdAt.$gte && filter.createdAt.$lte && filter.createdAt.$gte > filter.createdAt.$lte) {
        return res.status(400).json({
          success: false,
          message: req.t("payments.invalidDateRange"),
        });
      }
    }

    const { pageNumber, limitNumber, skip } = getPagination(page, limit);

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("sale", "patient items totalAmount discount paidAmount remainingAmount paymentStatus status createdAt")
        .populate("visit", "patient specialty doctor visitType consultationFee paymentStatus status completedAt")
        .populate("operation", "patient doctor operationName operationDate totalAmount doctorFeeAmount hospitalAmount paidAmount remainingAmount paymentStatus status")
        .populate("patient", "name phone")
        .populate("receivedBy", "name email role")
        .populate("cashDrawer", "openingBalance expectedCash actualCash difference status")
        .sort({ createdAt: -1 })
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
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get all payments error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getSinglePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const payment = await Payment.findById(id)
      .populate("sale", "patient items totalAmount discount paidAmount remainingAmount paymentStatus status createdAt")
      .populate("visit", "patient specialty doctor visitType consultationFee paymentStatus status completedAt")
      .populate("operation", "patient doctor operationName operationDate totalAmount doctorFeeAmount hospitalAmount paidAmount remainingAmount paymentStatus status")
      .populate("patient", "name phone")
      .populate("receivedBy", "name email role")
      .populate("cashDrawer", "openingBalance expectedCash actualCash difference status");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: req.t("payments.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Get single payment error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getSalePayments = async (req, res) => {
  try {
    const { saleId } = req.params;

    if (!isValidId(saleId)) {
      return res.status(400).json({
        success: false,
        message: req.t("payments.invalidSaleId"),
      });
    }

    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: req.t("payments.saleNotFound"),
      });
    }

    const payments = await Payment.find({ sale: saleId })
      .populate("patient", "name phone")
      .populate("receivedBy", "name email role")
      .populate("cashDrawer", "openingBalance expectedCash actualCash difference status")
      .sort({ createdAt: -1 });

    const completedPayments = payments.filter((payment) => payment.status === "completed");

    const totalPaid = completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const remainingAmount = Math.max(Number(sale.totalAmount || 0) - totalPaid, 0);

    return res.status(200).json({
      success: true,
      sale,
      summary: {
        totalAmount: Number(sale.totalAmount || 0),
        totalPaid,
        remainingAmount,
        paymentStatus: remainingAmount === 0 ? "paid" : totalPaid > 0 ? "partial" : "unpaid",
      },
      payments,
    });
  } catch (error) {
    console.error("Get sale payments error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getVisitPayments = async (req, res) => {
  try {
    const { visitId } = req.params;

    if (!isValidId(visitId)) {
      return res.status(400).json({
        success: false,
        message: req.t("payments.invalidVisitId"),
      });
    }

    const visit = await Visit.findById(visitId);

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: req.t("payments.visitNotFound"),
      });
    }

    const payments = await Payment.find({ visit: visitId })
      .populate("patient", "name phone")
      .populate("receivedBy", "name email role")
      .populate("cashDrawer", "openingBalance expectedCash actualCash difference status")
      .sort({ createdAt: -1 });

    const completedPayments = payments.filter((payment) => payment.status === "completed");

    const totalPaid = completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const remainingAmount = Math.max(Number(visit.consultationFee || 0) - totalPaid, 0);

    return res.status(200).json({
      success: true,
      visit,
      summary: {
        totalAmount: Number(visit.consultationFee || 0),
        totalPaid,
        remainingAmount,
        paymentStatus: remainingAmount === 0 ? "paid" : totalPaid > 0 ? "partial" : "unpaid",
      },
      payments,
    });
  } catch (error) {
    console.error("Get visit payments error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getOperationPayments = async (req, res) => {
  try {
    const { operationId } = req.params;

    if (!isValidId(operationId)) {
      return res.status(400).json({
        success: false,
        message: req.t("payments.invalidOperationId"),
      });
    }

    const operation = await Operation.findById(operationId);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: req.t("payments.operationNotFound"),
      });
    }

    const payments = await Payment.find({ operation: operationId })
      .populate("patient", "name phone")
      .populate("receivedBy", "name email role")
      .populate("cashDrawer", "openingBalance expectedCash actualCash difference status")
      .sort({ createdAt: -1 });

    const completedPayments = payments.filter((payment) => payment.status === "completed");

    const totalPaid = completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const totalAmount = Number(operation.totalAmount || 0);
    const remainingAmount = Math.max(totalAmount - totalPaid, 0);

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
      summary: {
        totalAmount,
        totalPaid,
        remainingAmount,
        paymentStatus: remainingAmount === 0 ? "paid" : totalPaid > 0 ? "partial" : "unpaid",
      },
    });
  } catch (error) {
    console.error("Get operation payments error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getPatientPayments = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!isValidId(patientId)) {
      return res.status(400).json({
        success: false,
        message: req.t("payments.invalidPatientId"),
      });
    }

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: req.t("payments.patientNotFound"),
      });
    }

    const payments = await Payment.find({ patient: patientId })
      .populate("sale", "totalAmount paidAmount remainingAmount paymentStatus status createdAt")
      .populate("visit", "consultationFee paymentStatus status")
      .populate("operation", "operationName totalAmount paidAmount remainingAmount paymentStatus status")
      .populate("receivedBy", "name email role")
      .populate("cashDrawer", "openingBalance expectedCash actualCash difference status")
      .sort({ createdAt: -1 });

    const completedPayments = payments.filter((payment) => payment.status === "completed");

    const totalPaid = completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return res.status(200).json({
      success: true,
      patient,
      summary: {
        totalPaid,
        totalPayments: payments.length,
        completedPayments: completedPayments.length,
      },
      payments,
    });
  } catch (error) {
    console.error("Get patient payments error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
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