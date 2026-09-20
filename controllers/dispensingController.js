const mongoose = require("mongoose");
const medicineBatchModels = require("../models/medicineBatch.models");
const stockTransactionModels = require("../models/stockTransaction.models");
const dispensingModels = require("../models/dispensing.models");
const saleModels = require("../models/sale.models");
const prescriptionModels = require("../models/prescription.models");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getPagination = (page, limit) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  return { pageNumber, limitNumber, skip: (pageNumber - 1) * limitNumber };
};

const getPopulatedDispensing = async (id) => {
  return dispensingModels
    .findById(id)
    .populate("sale", "prescription totalAmount paidAmount remainingAmount paymentStatus status createdAt")
    .populate("patient", "name phone")
    .populate("createdBy", "name role")
    .populate("items.medicine", "name genericName manufacturer")
    .populate("items.batch", "batchNumber expiryDate quantity");
};

const createDispensing = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { sale, reason } = req.body;

    if (!sale || !reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ success: false, message: req.t("dispensing.saleReasonRequired") });
    }

    if (!isValidId(sale)) {
      return res.status(400).json({ success: false, message: req.t("dispensing.invalidSaleId") });
    }

    session.startTransaction();

    const existingSale = await saleModels.findById(sale).session(session);

    if (!existingSale) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: req.t("dispensing.saleNotFound") });
    }

    if (existingSale.status === "cancelled") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: req.t("dispensing.cancelledSale") });
    }

    if (existingSale.status !== "completed") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: req.t("dispensing.incompleteSale") });
    }

    if (existingSale.paymentStatus !== "paid") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: req.t("dispensing.unpaidSale") });
    }

    if (Number(existingSale.remainingAmount) > 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: req.t("dispensing.remainingAmount") });
    }

    if (!Array.isArray(existingSale.items) || existingSale.items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: req.t("dispensing.saleItemsRequired") });
    }

    const existingDispensing = await dispensingModels.findOne({ sale: existingSale._id }).session(session);

    if (existingDispensing) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: req.t("dispensing.alreadyDispensed") });
    }

    let prescription = null;

    if (existingSale.prescription) {
      if (!isValidId(existingSale.prescription)) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: req.t("dispensing.invalidPrescriptionId") });
      }

      prescription = await prescriptionModels.findById(existingSale.prescription).session(session);

      if (!prescription) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: req.t("dispensing.prescriptionNotFound") });
      }

      if (prescription.status === "Cancelled") {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: req.t("dispensing.cancelledPrescription") });
      }

      if (prescription.status === "Dispensed") {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: req.t("dispensing.prescriptionAlreadyDispensed") });
      }
    }

    const stockChecks = [];
    const dispensingItems = [];
    const processedItems = [];

    for (const saleItem of existingSale.items) {
      const { medicine, batch, quantity } = saleItem;

      if (!medicine || !batch || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: req.t("dispensing.invalidSaleItem") });
      }

      if (!isValidId(medicine)) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: req.t("dispensing.invalidMedicineId") });
      }

      if (!isValidId(batch)) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: req.t("dispensing.invalidBatchId") });
      }

      const existingBatch = await medicineBatchModels.findById(batch).session(session);

      if (!existingBatch) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: req.t("dispensing.batchNotFound") });
      }

      if (existingBatch.medicine.toString() !== medicine.toString()) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: req.t("dispensing.batchMedicineMismatch") });
      }

      if (!existingBatch.isActive) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: req.t("dispensing.batchInactive", { batch: existingBatch.batchNumber }) });
      }

      if (existingBatch.expiryDate < new Date()) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: req.t("dispensing.batchExpired", { batch: existingBatch.batchNumber }) });
      }

      if (Number(existingBatch.quantity) < Number(quantity)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("dispensing.insufficientStock", {
            batch: existingBatch.batchNumber,
            available: existingBatch.quantity,
            required: quantity,
          }),
        });
      }

      stockChecks.push({
        medicine,
        batch: existingBatch,
        quantity: Number(quantity),
      });
    }

    for (const { medicine, batch, quantity } of stockChecks) {
      batch.quantity = Number(batch.quantity) - quantity;

      if (batch.quantity === 0) {
        batch.isActive = false;
      }

      await batch.save({ session });

      await stockTransactionModels.create([
        {
          medicine,
          batch: batch._id,
          type: "OUT",
          quantity,
          reason: reason.trim(),
          user: req.user._id,
        },
      ], { session });

      dispensingItems.push({
        medicine,
        batch: batch._id,
        quantity,
      });

      processedItems.push({
        medicine,
        batch: batch._id,
        quantity,
      });
    }

    const dispensing = await dispensingModels.create([
      {
        sale: existingSale._id,
        patient: existingSale.patient || null,
        items: dispensingItems,
        reason: reason.trim(),
        createdBy: req.user._id,
      },
    ], { session });

    if (prescription) {
      for (const prescriptionItem of prescription.items) {
        const saleQuantity = existingSale.items
          .filter((saleItem) => saleItem.medicine.toString() === prescriptionItem.medicine.toString())
          .reduce((total, saleItem) => total + Number(saleItem.quantity), 0);

        prescriptionItem.dispensedQuantity = Math.min(
          Number(prescriptionItem.quantity),
          Number(prescriptionItem.dispensedQuantity || 0) + saleQuantity
        );
      }

      const allDispensed = prescription.items.every(
        (item) => Number(item.dispensedQuantity || 0) >= Number(item.quantity)
      );

      const anyDispensed = prescription.items.some(
        (item) => Number(item.dispensedQuantity || 0) > 0
      );

      prescription.status = allDispensed ? "Dispensed" : anyDispensed ? "Partially Dispensed" : "Pending";

      await prescription.save({ session });
    }

    await session.commitTransaction();

    const createdDispensing = await getPopulatedDispensing(dispensing[0]._id);

    return res.status(201).json({
      success: true,
      message: req.t("dispensing.createdSuccessfully"),
      dispensing: createdDispensing,
      processedItems,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Create dispensing error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  } finally {
    await session.endSession();
  }
};

const getSingleDispenses = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: req.t("common.invalidId") });
    }

    const dispense = await getPopulatedDispensing(id);

    if (!dispense) {
      return res.status(404).json({ success: false, message: req.t("dispensing.notFound") });
    }

    return res.status(200).json({ success: true, dispense });
  } catch (error) {
    console.error("Get dispensing error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const getAllDispenses = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { pageNumber, limitNumber, skip } = getPagination(page, limit);

    const [total, dispenses] = await Promise.all([
      dispensingModels.countDocuments(),
      dispensingModels
        .find()
        .populate("sale", "prescription totalAmount paidAmount remainingAmount paymentStatus status createdAt")
        .populate("patient", "name phone")
        .populate("createdBy", "name role")
        .populate("items.medicine", "name genericName manufacturer")
        .populate("items.batch", "batchNumber expiryDate quantity")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
    ]);

    return res.status(200).json({
      success: true,
      dispenses,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get dispensings error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const getAvailableSalesForDispensing = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const limitNumber = Number(limit);

    if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({ success: false, message: req.t("dispensing.invalidLimit") });
    }

    const dispensedSales = await dispensingModels.distinct("sale");

    const sales = await saleModels
      .find({
        _id: { $nin: dispensedSales },
        paymentStatus: "paid",
        remainingAmount: 0,
        status: "completed",
      })
      .populate("prescription", "status notes consultation")
      .populate("patient", "name phone")
      .populate("items.medicine", "name genericName manufacturer")
      .populate("items.batch", "batchNumber expiryDate")
      .sort({ createdAt: -1 })
      .limit(limitNumber);

    const availableSales = sales.filter((sale) => {
      if (!sale.prescription) return true;
      return sale.prescription.status !== "Cancelled" && sale.prescription.status !== "Dispensed";
    });

    return res.status(200).json({
      success: true,
      sales: availableSales,
    });
  } catch (error) {
    console.error("Get available sales error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

module.exports = {
  createDispensing,
  getAllDispenses,
  getSingleDispenses,
  getAvailableSalesForDispensing,
};