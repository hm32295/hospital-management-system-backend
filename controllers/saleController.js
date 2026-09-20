const mongoose = require("mongoose");
const saleModels = require("../models/sale.models");
const medicineModels = require("../models/medicine.models");
const medicineBatchModels = require("../models/medicineBatch.models");
const patientModels = require("../models/patient.models");
const prescriptionModels = require("../models/prescription.models");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getPagination = (page, limit) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  return { pageNumber, limitNumber, skip: (pageNumber - 1) * limitNumber };
};

const populateSale = (query) => {
  return query
    .populate("patient", "name phone")
    .populate("createdBy", "name email role")
    .populate("prescription", "status notes consultation")
    .populate("items.medicine", "name genericName manufacturer")
    .populate("items.batch", "batchNumber expiryDate sellingPrice");
};

const validateDiscount = (discount, req) => {
  const discountValue = Number(discount);

  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return {
      valid: false,
      message: req.t("sales.invalidDiscount"),
    };
  }

  return {
    valid: true,
    value: discountValue,
  };
};

const createSale = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { patient, items, discount = 0, notes = "" } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: req.t("sales.itemsRequired"),
      });
    }

    if (patient && !isValidId(patient)) {
      return res.status(400).json({
        success: false,
        message: req.t("sales.invalidPatientId"),
      });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("sales.invalidNotes"),
      });
    }

    const discountResult = validateDiscount(discount, req);

    if (!discountResult.valid) {
      return res.status(400).json({
        success: false,
        message: discountResult.message,
      });
    }

    const discountValue = discountResult.value;

    session.startTransaction();

    let patientId = null;

    if (patient) {
      const existingPatient = await patientModels.findById(patient).session(session);

      if (!existingPatient) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: req.t("sales.patientNotFound"),
        });
      }

      if (!existingPatient.isActive) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.patientInactive"),
        });
      }

      patientId = existingPatient._id;
    }

    const saleItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { medicine, batch, quantity } = item;

      if (!medicine || !batch || quantity === undefined || quantity === null) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.itemRequiredFields"),
        });
      }

      if (!isValidId(medicine)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.invalidMedicineId"),
        });
      }

      if (!isValidId(batch)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.invalidBatchId"),
        });
      }

      const requestedQuantity = Number(quantity);

      if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.invalidQuantity"),
        });
      }

      const existingMedicine = await medicineModels.findById(medicine).session(session);

      if (!existingMedicine) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: req.t("sales.medicineNotFound"),
        });
      }

      if (!existingMedicine.isActive) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.medicineInactive"),
        });
      }

      const existingBatch = await medicineBatchModels.findById(batch).session(session);

      if (!existingBatch) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: req.t("sales.batchNotFound"),
        });
      }

      if (existingBatch.medicine.toString() !== existingMedicine._id.toString()) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.batchMedicineMismatch"),
        });
      }

      if (!existingBatch.isActive) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.batchInactive", {
            batch: existingBatch.batchNumber,
          }),
        });
      }

      if (existingBatch.expiryDate < new Date()) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.batchExpired", {
            batch: existingBatch.batchNumber,
          }),
        });
      }

      if (Number(existingBatch.quantity) < requestedQuantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.insufficientStock", {
            medicine: existingMedicine.name,
            available: existingBatch.quantity,
            required: requestedQuantity,
          }),
        });
      }

      const unitPrice = Number(existingBatch.sellingPrice);
      const itemTotal = requestedQuantity * unitPrice;

      saleItems.push({
        medicine: existingMedicine._id,
        batch: existingBatch._id,
        quantity: requestedQuantity,
        unitPrice,
        total: itemTotal,
      });

      subtotal += itemTotal;
    }

    if (discountValue > subtotal) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("sales.discountGreaterThanSubtotal"),
      });
    }

    const totalAmount = subtotal - discountValue;
    const paidAmount = 0;
    const remainingAmount = totalAmount;
    const paymentStatus = totalAmount === 0 ? "paid" : "unpaid";

    const sale = await saleModels.create([
      {
        patient: patientId,
        createdBy: req.user._id,
        items: saleItems,
        subtotal,
        discount: discountValue,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        status: "pending",
        notes: notes?.trim() || "",
      },
    ], { session });

    await session.commitTransaction();

    const populatedSale = await populateSale(
      saleModels.findById(sale[0]._id)
    );

    return res.status(201).json({
      success: true,
      message: req.t("sales.createdSuccessfully"),
      sale: populatedSale,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();

    console.error("Create sale error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  } finally {
    await session.endSession();
  }
};

const getAllSales = async (req, res) => {
  try {
    const { patient, paymentStatus, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (patient) {
      if (!isValidId(patient)) {
        return res.status(400).json({
          success: false,
          message: req.t("sales.invalidPatientId"),
        });
      }

      filter.patient = patient;
    }

    if (paymentStatus) {
      if (!["unpaid", "partial", "paid"].includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: req.t("sales.invalidPaymentStatus"),
        });
      }

      filter.paymentStatus = paymentStatus;
    }

    if (status) {
      if (!["pending", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: req.t("sales.invalidStatus"),
        });
      }

      filter.status = status;
    }

    const { pageNumber, limitNumber, skip } = getPagination(page, limit);

    const [total, sales] = await Promise.all([
      saleModels.countDocuments(filter),
      populateSale(
        saleModels.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber)
      ),
    ]);

    return res.status(200).json({
      success: true,
      sales,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get sales error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getSingleSale = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const sale = await populateSale(saleModels.findById(id));

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: req.t("sales.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error("Get single sale error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getPatientSales = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!isValidId(patientId)) {
      return res.status(400).json({
        success: false,
        message: req.t("sales.invalidPatientId"),
      });
    }

    const patient = await patientModels.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: req.t("sales.patientNotFound"),
      });
    }

    const sales = await saleModels
      .find({ patient: patientId })
      .populate("createdBy", "name role")
      .populate("items.medicine", "name genericName manufacturer")
      .populate("items.batch", "batchNumber expiryDate")
      .populate("prescription", "status notes consultation")
      .sort({ createdAt: -1 });

    const summary = sales.reduce(
      (acc, sale) => {
        acc.totalSales += Number(sale.totalAmount);
        acc.totalPaid += Number(sale.paidAmount);
        acc.totalRemaining += Number(sale.remainingAmount);
        return acc;
      },
      { totalSales: 0, totalPaid: 0, totalRemaining: 0 }
    );

    return res.status(200).json({
      success: true,
      patient,
      summary,
      sales,
    });
  } catch (error) {
    console.error("Get patient sales error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const createSaleFromPrescription = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { prescriptionId } = req.params;
    const { discount = 0, notes = "" } = req.body;

    if (!isValidId(prescriptionId)) {
      return res.status(400).json({
        success: false,
        message: req.t("sales.invalidPrescriptionId"),
      });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("sales.invalidNotes"),
      });
    }

    const discountResult = validateDiscount(discount, req);

    if (!discountResult.valid) {
      return res.status(400).json({
        success: false,
        message: discountResult.message,
      });
    }

    const discountValue = discountResult.value;

    session.startTransaction();

    const prescription = await prescriptionModels
      .findById(prescriptionId)
      .session(session);

    if (!prescription) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: req.t("sales.prescriptionNotFound"),
      });
    }

    if (prescription.status === "Cancelled") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("sales.cancelledPrescription"),
      });
    }

    if (prescription.status === "Dispensed") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("sales.dispensedPrescription"),
      });
    }

    const existingSale = await saleModels.findOne({
      prescription: prescription._id,
    }).session(session);

    if (existingSale) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: req.t("sales.prescriptionSaleExists"),
      });
    }

    const saleItems = [];
    let subtotal = 0;

    for (const item of prescription.items) {
      const remainingQuantity = Number(item.quantity) - Number(item.dispensedQuantity || 0);

      if (remainingQuantity <= 0) continue;

      if (!isValidId(item.medicine)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.invalidMedicineId"),
        });
      }

      const medicine = await medicineModels.findById(item.medicine).session(session);

      if (!medicine) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: req.t("sales.medicineNotFound"),
        });
      }

      if (!medicine.isActive) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.medicineInactive"),
        });
      }

      const batches = await medicineBatchModels
        .find({
          medicine: medicine._id,
          isActive: true,
          quantity: { $gt: 0 },
          expiryDate: { $gte: new Date() },
        })
        .sort({ expiryDate: 1 })
        .session(session);

      const totalAvailable = batches.reduce(
        (total, batch) => total + Number(batch.quantity),
        0
      );

      if (totalAvailable < remainingQuantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: req.t("sales.insufficientMedicineStock", {
            medicine: medicine.name,
            required: remainingQuantity,
            available: totalAvailable,
          }),
        });
      }

      let quantityToAdd = remainingQuantity;

      for (const batch of batches) {
        if (quantityToAdd <= 0) break;

        const quantityFromBatch = Math.min(
          Number(batch.quantity),
          quantityToAdd
        );

        const unitPrice = Number(batch.sellingPrice);
        const itemTotal = quantityFromBatch * unitPrice;

        saleItems.push({
          medicine: medicine._id,
          batch: batch._id,
          quantity: quantityFromBatch,
          unitPrice,
          total: itemTotal,
        });

        subtotal += itemTotal;
        quantityToAdd -= quantityFromBatch;
      }
    }

    if (saleItems.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("sales.noRemainingMedicines"),
      });
    }

    if (discountValue > subtotal) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: req.t("sales.discountGreaterThanSubtotal"),
      });
    }

    const totalAmount = subtotal - discountValue;
    const paidAmount = 0;
    const remainingAmount = totalAmount;
    const paymentStatus = totalAmount === 0 ? "paid" : "unpaid";

    const sale = await saleModels.create([
      {
        prescription: prescription._id,
        patient: prescription.patient || null,
        createdBy: req.user._id,
        items: saleItems,
        subtotal,
        discount: discountValue,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        status: "pending",
        notes: notes?.trim() || "",
      },
    ], { session });

    await session.commitTransaction();

    const populatedSale = await populateSale(
      saleModels.findById(sale[0]._id)
    );

    return res.status(201).json({
      success: true,
      message: req.t("sales.createdFromPrescriptionSuccessfully"),
      sale: populatedSale,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();

    console.error("Create sale from prescription error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  } finally {
    await session.endSession();
  }
};

const getSaleByPrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    if (!isValidId(prescriptionId)) {
      return res.status(400).json({
        success: false,
        message: req.t("sales.invalidPrescriptionId"),
      });
    }

    const sale = await populateSale(
      saleModels.findOne({ prescription: prescriptionId })
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: req.t("sales.notFoundForPrescription"),
      });
    }

    return res.status(200).json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error("Get sale by prescription error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

module.exports = {
  createSale,
  getAllSales,
  getSingleSale,
  getPatientSales,
  createSaleFromPrescription,
  getSaleByPrescription,
};