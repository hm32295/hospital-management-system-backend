const mongoose = require("mongoose");
const Prescription = require("../models/prescription.models");
const Medicine = require("../models/medicine.models");
const MedicineBatch = require("../models/medicineBatch.models");
const StockTransaction = require("../models/stockTransaction.models");
const Consultation = require("../models/consultation.model");
const Visit = require("../models/visit.model");
const Sale = require("../models/sale.models");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getPagination = (page, limit) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  return { pageNumber, limitNumber, skip: (pageNumber - 1) * limitNumber };
};

const validateItems = async (items, req) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: req.t("prescriptions.itemsRequired") };
  }

  for (const item of items) {
    if (!item || !item.medicine || item.quantity === undefined || item.quantity === null || !item.dosage || !item.frequency || !item.duration) {
      return { error: req.t("prescriptions.itemRequiredFields") };
    }

    if (!isValidId(item.medicine)) {
      return { error: req.t("prescriptions.invalidMedicineId") };
    }

    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
      return { error: req.t("prescriptions.invalidQuantity") };
    }

    if (typeof item.dosage !== "string" || !item.dosage.trim() || typeof item.frequency !== "string" || !item.frequency.trim() || typeof item.duration !== "string" || !item.duration.trim()) {
      return { error: req.t("prescriptions.itemRequiredFields") };
    }

    const medicine = await Medicine.findById(item.medicine).select("_id isActive");
    if (!medicine) {
      return { status: 404, error: req.t("prescriptions.medicineNotFound") };
    }

    if (!medicine.isActive) {
      return { status: 400, error: req.t("prescriptions.medicineInactive") };
    }
  }

  return { error: null };
};



const createPrescription = async (req, res) => {
  try {
    const { consultation, items, notes } = req.body;

    if (!consultation || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: req.t("prescriptions.consultationItemsRequired") });
    }

    if (!isValidId(consultation)) {
      return res.status(400).json({ success: false, message: req.t("prescriptions.invalidConsultationId") });
    }

    const existingConsultation = await Consultation.findById(consultation);
    if (!existingConsultation) {
      return res.status(404).json({ success: false, message: req.t("prescriptions.consultationNotFound") });
    }

    if (!existingConsultation.patient || !existingConsultation.doctor || !existingConsultation.visit) {
      return res.status(400).json({ success: false, message: req.t("prescriptions.invalidConsultationData") });
    }

    if (!isValidId(existingConsultation.visit) || !isValidId(existingConsultation.patient) || !isValidId(existingConsultation.doctor)) {
      return res.status(400).json({ success: false, message: req.t("prescriptions.invalidConsultationData") });
    }

    const existingVisit = await Visit.findById(existingConsultation.visit).select("patient doctor status");
    if (!existingVisit) {
      return res.status(404).json({ success: false, message: req.t("prescriptions.visitNotFound") });
    }

    if (existingVisit.status === "cancelled") {
      return res.status(400).json({ success: false, message: req.t("prescriptions.cancelledVisit") });
    }

    if (existingVisit.patient?.toString() !== existingConsultation.patient?.toString()) {
      return res.status(400).json({ success: false, message: req.t("prescriptions.patientMismatch") });
    }

    if (existingVisit.doctor?.toString() !== existingConsultation.doctor?.toString()) {
      return res.status(400).json({ success: false, message: req.t("prescriptions.doctorMismatch") });
    }

    const existingPrescription = await Prescription.findOne({ consultation });
    if (existingPrescription) {
      return res.status(409).json({ success: false, message: req.t("prescriptions.alreadyExists"), prescription: existingPrescription });
    }

    const validation = await validateItems(items, req);
    if (validation.error) {
      return res.status(validation.status || 400).json({ success: false, message: validation.error });
    }

    const prescription = await Prescription.create({
      consultation,
      patient: existingConsultation.patient,
      items,
      notes: typeof notes === "string" ? notes.trim() || null : null,
      status: "Pending",
      createdBy: req.user._id,
    });

    const createdPrescription = await Prescription.findById(prescription._id)
      .populate("patient", "name phone email nationalId dateOfBirth gender")
      .populate("createdBy", "name email role")
      .populate("consultation", "visit patient doctor symptoms diagnosis notes createdAt updatedAt")
      .populate("items.medicine", "name genericName manufacturer");

    return res.status(201).json({
      success: true,
      message: req.t("prescriptions.createdSuccessfully"),
      prescription: createdPrescription,
    });
  } catch (error) {
    console.error("Create prescription error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const getAllPrescriptions = async (req, res) => {
  try {
    const { patient, consultation, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (patient) {
      if (!isValidId(patient)) {
        return res.status(400).json({ success: false, message: req.t("prescriptions.invalidPatientId") });
      }
      filter.patient = patient;
    }

    if (consultation) {
      if (!isValidId(consultation)) {
        return res.status(400).json({ success: false, message: req.t("prescriptions.invalidConsultationId") });
      }
      filter.consultation = consultation;
    }

    if (status) {
      const allowedStatuses = ["Pending", "Partially Dispensed", "Dispensed", "Cancelled"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: req.t("prescriptions.invalidStatus") });
      }
      filter.status = status;
    }

    const { pageNumber, limitNumber, skip } = getPagination(page, limit);

    const [total, prescriptions] = await Promise.all([
      Prescription.countDocuments(filter),
      Prescription.find(filter)
        .populate("patient", "name phone email")
        .populate("createdBy", "name email role")
        .populate("consultation", "visit doctor symptoms diagnosis notes createdAt updatedAt")
        .populate("items.medicine", "name genericName manufacturer")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
    ]);

    return res.status(200).json({
      success: true,
      prescriptions,
      pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) },
    });
  } catch (error) {
    console.error("Get prescriptions error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const getSinglePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: req.t("common.invalidId") });
    }

    const prescription = await Prescription.findById(id)
      .populate("patient", "name phone email nationalId dateOfBirth gender address")
      .populate("createdBy", "name email role")
      .populate("consultation", "visit patient doctor symptoms diagnosis notes createdAt updatedAt")
      .populate("items.medicine", "name genericName manufacturer");

    if (!prescription) {
      return res.status(404).json({ success: false, message: req.t("prescriptions.notFound") });
    }

    return res.status(200).json({ success: true, prescription });
  } catch (error) {
    console.error("Get prescription error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: req.t("common.invalidId") });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: req.t("prescriptions.notFound") });
    }

    if (prescription.status === "Cancelled") {
      return res.status(400).json({ success: false, message: req.t("prescriptions.cancelledCannotUpdate") });
    }

    if (prescription.status === "Partially Dispensed") {
      return res.status(400).json({ success: false, message: req.t("prescriptions.partialCannotUpdate") });
    }

    if (prescription.status === "Dispensed") {
      return res.status(400).json({ success: false, message: req.t("prescriptions.dispensedCannotUpdate") });
    }

    const existingSale = await Sale.findOne({ prescription: prescription._id }).select("_id");
    if (existingSale) {
      return res.status(400).json({ success: false, message: req.t("prescriptions.saleExistsCannotUpdate") });
    }

    const { items, notes } = req.body;

    if (items !== undefined) {
      const validation = await validateItems(items, req);
      if (validation.error) {
        return res.status(validation.status || 400).json({ success: false, message: validation.error });
      }
      prescription.items = items;
    }

    if (notes !== undefined) {
      if (notes !== null && typeof notes !== "string") {
        return res.status(400).json({ success: false, message: req.t("prescriptions.invalidNotes") });
      }
      prescription.notes = typeof notes === "string" ? notes.trim() || null : null;
    }

    await prescription.save();

    const updatedPrescription = await Prescription.findById(prescription._id)
      .populate("patient", "name phone email")
      .populate("createdBy", "name email role")
      .populate("consultation", "visit patient doctor symptoms diagnosis notes createdAt updatedAt")
      .populate("items.medicine", "name genericName manufacturer");

    return res.status(200).json({
      success: true,
      message: req.t("prescriptions.updatedSuccessfully"),
      prescription: updatedPrescription,
    });
  } catch (error) {
    console.error("Update prescription error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const cancelPrescription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: req.t("common.invalidId") });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: req.t("prescriptions.notFound") });
    }

    if (prescription.status === "Dispensed") {
      return res.status(400).json({ success: false, message: req.t("prescriptions.dispensedCannotCancel") });
    }

    if (prescription.status === "Cancelled") {
      return res.status(400).json({ success: false, message: req.t("prescriptions.alreadyCancelled") });
    }

    if (prescription.status === "Partially Dispensed") {
      return res.status(400).json({ success: false, message: req.t("prescriptions.partialCannotCancel") });
    }

    const existingSale = await Sale.findOne({ prescription: prescription._id }).select("_id");
    if (existingSale) {
      return res.status(400).json({ success: false, message: req.t("prescriptions.saleExistsCannotCancel") });
    }

    prescription.status = "Cancelled";
    await prescription.save();

    return res.status(200).json({
      success: true,
      message: req.t("prescriptions.cancelledSuccessfully"),
      prescription,
    });
  } catch (error) {
    console.error("Cancel prescription error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const dispensePrescription = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;

    if (!isValidId(id)) {
      await session.abortTransaction();
      return res.status(400).json({success: false,message: req.t("common.invalidId")});
    }

    const prescription = await Prescription.findById(id).session(session);

    if (!prescription) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: req.t("prescriptions.notFound"),
      });
    }

    if (prescription.status === "Cancelled") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("prescriptions.cancelledCannotDispense"),
      });
    }

    if (prescription.status === "Dispensed") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("prescriptions.alreadyDispensed"),
      });
    }

    const sale = await Sale.findOne({
      prescription: prescription._id,
    }).session(session);

    if (!sale) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("prescriptions.saleRequired"),
      });
    }

    if (sale.status === "cancelled") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("prescriptions.cancelledSale"),
      });
    }

    if (sale.status !== "completed" || sale.paymentStatus !== "paid") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("prescriptions.saleNotPaid"),
      });
    }

    const itemsToDispense = [];

    for (const item of prescription.items) {
      const remainingQuantity = Number(item.quantity) - Number(item.dispensedQuantity || 0);

      if (remainingQuantity < 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("prescriptions.invalidDispensedQuantity"),
        });
      }

      if (remainingQuantity === 0) continue;

      const batches = await MedicineBatch.find({
        medicine: item.medicine,
        isActive: true,
        quantity: { $gt: 0 },
        expiryDate: { $gte: new Date() },
      })
        .sort({ expiryDate: 1 })
        .session(session);

      const totalAvailable = batches.reduce((total, batch) => total + Number(batch.quantity), 0);

      if (totalAvailable < remainingQuantity) {
        const medicine = await Medicine.findById(item.medicine).select("name").session(session);

        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: req.t("prescriptions.insufficientStock", {
            medicine: medicine?.name || item.medicine,
            required: remainingQuantity,
            available: totalAvailable,
          }),
        });
      }

      itemsToDispense.push({
        item,
        batches,
        remainingQuantity,
      });
    }

    if (itemsToDispense.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("prescriptions.noRemainingMedicines"),
      });
    }

    const processedItems = [];

    for (const { item, batches, remainingQuantity } of itemsToDispense) {
      let quantityToDispense = remainingQuantity;
      let dispensedNow = 0;
      const transactions = [];

      for (const batch of batches) {
        if (quantityToDispense <= 0) break;

        const quantityFromBatch = Math.min(
          Number(batch.quantity),
          quantityToDispense
        );

        batch.quantity -= quantityFromBatch;

        await batch.save({ session });

        await StockTransaction.create(
          [{
            medicine: item.medicine,
            batch: batch._id,
            type: "OUT",
            quantity: quantityFromBatch,
            reason: `Prescription ${prescription._id}`,
            user: req.user._id,
          }],
          { session }
        );

        transactions.push({
          batch: batch._id,
          quantity: quantityFromBatch,
          expiryDate: batch.expiryDate,
        });

        dispensedNow += quantityFromBatch;
        quantityToDispense -= quantityFromBatch;
      }

      item.dispensedQuantity = Number(item.dispensedQuantity || 0) + dispensedNow;

      processedItems.push({
        medicine: item.medicine,
        requested: item.quantity,
        dispensedNow,
        totalDispensed: item.dispensedQuantity,
        remaining: Number(item.quantity) - Number(item.dispensedQuantity),
        transactions,
      });
    }

    const allDispensed = prescription.items.every(
      (item) => Number(item.dispensedQuantity || 0) >= Number(item.quantity)
    );

    const anyDispensed = prescription.items.some(
      (item) => Number(item.dispensedQuantity || 0) > 0
    );

    prescription.status = allDispensed
      ? "Dispensed"
      : anyDispensed
        ? "Partially Dispensed"
        : "Pending";

    await prescription.save({ session });

    await session.commitTransaction();

    const updatedPrescription = await Prescription.findById(prescription._id)
      .populate("patient", "name phone email")
      .populate("createdBy", "name email role")
      .populate("consultation", "visit patient doctor symptoms diagnosis notes")
      .populate("items.medicine", "name genericName manufacturer");

    return res.status(200).json({
      success: true,
      message: req.t("prescriptions.dispensedSuccessfully"),
      status: updatedPrescription.status,
      prescription: updatedPrescription,
      processedItems,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Dispense prescription error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  } finally {
    await session.endSession();
  }
};

const getPrescriptionByConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!isValidId(consultationId)) {
      return res.status(400).json({ success: false, message: req.t("prescriptions.invalidConsultationId") });
    }

    const prescription = await Prescription.findOne({ consultation: consultationId })
      .populate("patient", "name phone email nationalId dateOfBirth gender address")
      .populate("createdBy", "name email role")
      .populate("consultation", "visit patient doctor symptoms diagnosis notes createdAt updatedAt")
      .populate("items.medicine", "name genericName manufacturer");

    if (!prescription) {
      return res.status(404).json({ success: false, message: req.t("prescriptions.notFoundForConsultation") });
    }

    return res.status(200).json({ success: true, prescription });
  } catch (error) {
    console.error("Get prescription by consultation error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

module.exports = { createPrescription, getAllPrescriptions, getSinglePrescription, updatePrescription, cancelPrescription, dispensePrescription, getPrescriptionByConsultation };