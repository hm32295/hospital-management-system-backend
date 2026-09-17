const mongoose = require("mongoose");
const medicineBatchModels = require("../models/medicineBatch.models");
const stockTransactionModels = require("../models/stockTransaction.models");
const dispensingModels = require("../models/dispensing.models");
const saleModels = require("../models/sale.models");
const prescriptionModels = require("../models/prescription.models");

const createDispensing = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { sale, reason } = req.body;

    if (!sale || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Sale and reason are required",
      });
    }

    session.startTransaction();

    const existingSale =
      await saleModels
        .findById(sale)
        .session(session);

    if (!existingSale) {
      throw new Error("Sale not found");
    }

    if (existingSale.status === "cancelled") {
      throw new Error(
        "Cannot dispense a cancelled sale"
      );
    }

    if (existingSale.status !== "completed") {
      throw new Error(
        "Cannot dispense an incomplete sale"
      );
    }

    if (existingSale.paymentStatus !== "paid") {
      throw new Error(
        "Cannot dispense unpaid sale"
      );
    }

    if (existingSale.remainingAmount > 0) {
      throw new Error(
        "Sale still has remaining amount"
      );
    }

    const existingDispensing =
      await dispensingModels
        .findOne({
          sale: existingSale._id,
        })
        .session(session);

    if (existingDispensing) {
      throw new Error(
        "This sale has already been dispensed"
      );
    }

    let prescription = null;

    if (existingSale.prescription) {
      prescription =
        await prescriptionModels
          .findById(
            existingSale.prescription
          )
          .session(session);

      if (!prescription) {
        throw new Error(
          "Prescription linked to sale not found"
        );
      }

      if (prescription.status === "Cancelled") {
        throw new Error(
          "Cancelled prescription cannot be dispensed"
        );
      }

      if (
        prescription.status === "Dispensed"
      ) {
        throw new Error(
          "Prescription is already fully dispensed"
        );
      }
    }

    const dispensingItems = [];
    const processedItems = [];

    const stockChecks = [];

    for (const saleItem of existingSale.items) {
      const {
        medicine,
        batch,
        quantity,
      } = saleItem;

      const existingBatch =
        await medicineBatchModels
          .findById(batch)
          .session(session);

      if (!existingBatch) {
        throw new Error(
          "Medicine batch not found"
        );
      }

      if (
        existingBatch.medicine.toString() !==
        medicine.toString()
      ) {
        throw new Error(
          "Batch does not belong to medicine"
        );
      }

      if (!existingBatch.isActive) {
        throw new Error(
          `Batch ${existingBatch.batchNumber} is inactive`
        );
      }

      if (
        existingBatch.expiryDate < new Date()
      ) {
        throw new Error(
          `Batch ${existingBatch.batchNumber} has expired`
        );
      }

      if (existingBatch.quantity < quantity) {
        throw new Error(
          `Insufficient stock for batch ${existingBatch.batchNumber}. Available: ${existingBatch.quantity}, Required: ${quantity}`
        );
      }

      stockChecks.push({
        medicine,
        batch: existingBatch,
        quantity,
      });
    }

    for (const {
      medicine,
      batch,
      quantity,
    } of stockChecks) {
      batch.quantity -= quantity;

      if (batch.quantity === 0) {
        batch.isActive = false;
      }

      await batch.save({
        session,
      });

      await stockTransactionModels.create(
        [
          {
            medicine,
            batch: batch._id,
            type: "OUT",
            quantity,
            reason: reason.trim(),
            user: req.user._id,
          },
        ],
        {
          session,
        }
      );

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

    const dispensing =
      await dispensingModels.create(
        [
          {
            sale: existingSale._id,
            patient:
              existingSale.patient || null,
            items: dispensingItems,
            reason: reason.trim(),
            createdBy: req.user._id,
          },
        ],
        {
          session,
        }
      );

    if (prescription) {
      for (const prescriptionItem of prescription.items) {
        const saleQuantity =
          existingSale.items
            .filter(
              (saleItem) =>
                saleItem.medicine.toString() ===
                prescriptionItem.medicine.toString()
            )
            .reduce(
              (total, saleItem) =>
                total + saleItem.quantity,
              0
            );

        prescriptionItem.dispensedQuantity =
          Math.min(
            prescriptionItem.quantity,
            prescriptionItem.dispensedQuantity +
              saleQuantity
          );
      }

      const allDispensed =
        prescription.items.every(
          (item) =>
            item.dispensedQuantity >=
            item.quantity
        );

      const anyDispensed =
        prescription.items.some(
          (item) =>
            item.dispensedQuantity > 0
        );

      if (allDispensed) {
        prescription.status =
          "Dispensed";
      } else if (anyDispensed) {
        prescription.status =
          "Partially Dispensed";
      } else {
        prescription.status =
          "Pending";
      }

      await prescription.save({
        session,
      });
    }

    await session.commitTransaction();

    const createdDispensing =
      await dispensingModels
        .findById(dispensing[0]._id)
        .populate(
          "sale",
          "prescription totalAmount paidAmount remainingAmount paymentStatus status createdAt"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "createdBy",
          "name role"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        )
        .populate(
          "items.batch",
          "batchNumber expiryDate quantity"
        );

    return res.status(201).json({
      success: true,
      message:
        "Medicine dispensed successfully",
      dispensing: createdDispensing,
      processedItems,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "Create dispensing error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    await session.endSession();
  }
};

const getSingleDispenses = async (
  req,
  res
) => {
  const { id } = req.params;

  try {
    const dispense =
      await dispensingModels
        .findById(id)
        .populate(
          "sale",
          "prescription totalAmount paidAmount remainingAmount paymentStatus status createdAt"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "createdBy",
          "name role"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        )
        .populate(
          "items.batch",
          "batchNumber expiryDate quantity"
        );

    if (!dispense) {
      return res.status(404).json({
        success: false,
        message: "Dispensing not found",
      });
    }

    return res.status(200).json({
      success: true,
      dispense,
    });
  } catch (error) {
    console.error(
      "Get dispensing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllDispenses = async (
  req,
  res
) => {
  try {
    const {
      limit = 10,
      page = 1,
    } = req.query;

    const filter = {};

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(
        Number(limit) || 10,
        1
      ),
      100
    );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const total =
      await dispensingModels.countDocuments(
        filter
      );

    const dispenses =
      await dispensingModels
        .find(filter)
        .populate(
          "sale",
          "prescription totalAmount paidAmount remainingAmount paymentStatus status createdAt"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "createdBy",
          "name role"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        )
        .populate(
          "items.batch",
          "batchNumber expiryDate quantity"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      dispenses,
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
    console.error(
      "Get dispensings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAvailableSalesForDispensing =
  async (req, res) => {
    try {
      const {
        limit = 100,
      } = req.query;

      const dispensedSales =
        await dispensingModels.distinct(
          "sale"
        );

      const sales =
        await saleModels
          .find({
            _id: {
              $nin: dispensedSales,
            },
            paymentStatus: "paid",
            remainingAmount: 0,
            status: "completed",
            $or: [
              {
                prescription: null,
              },
              {
                prescription: {
                  $exists: false,
                },
              },
              {
                prescription: {
                  $ne: null,
                },
              },
            ],
          })
          .populate(
            "prescription",
            "status notes consultation"
          )
          .populate(
            "patient",
            "name phone"
          )
          .populate(
            "items.medicine",
            "name genericName manufacturer"
          )
          .populate(
            "items.batch",
            "batchNumber expiryDate"
          )
          .sort({
            createdAt: -1,
          })
          .limit(
            Math.min(
              Number(limit) || 100,
              100
            )
          );

      const availableSales =
        sales.filter((sale) => {
          if (!sale.prescription) {
            return true;
          }

          return (
            sale.prescription.status !==
              "Cancelled" &&
            sale.prescription.status !==
              "Dispensed"
          );
        });

      return res.status(200).json({
        success: true,
        sales: availableSales,
      });
    } catch (error) {
      console.error(
        "Get available sales error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

module.exports = {
  createDispensing,
  getAllDispenses,
  getSingleDispenses,
  getAvailableSalesForDispensing,
};


