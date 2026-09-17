const mongoose = require("mongoose");

const Prescription = require("../models/prescription.models");
const Medicine = require("../models/medicine.models");
const MedicineBatch = require("../models/medicineBatch.models");
const StockTransaction = require("../models/stockTransaction.models");
const Consultation = require("../models/consultation.model");
const Visit = require("../models/visit.model");
const Sale = require("../models/sale.models");

const createPrescription = async (req, res) => {
  try {
    const { consultation, items, notes } = req.body;

    if (
      !consultation ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Consultation and prescription items are required",
      });
    }

    const existingConsultation =
      await Consultation.findById(consultation);

    if (!existingConsultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    const existingVisit = await Visit.findById(
      existingConsultation.visit
    );

    if (!existingVisit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    if (existingVisit.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot create prescription for a cancelled visit",
      });
    }

    if (existingVisit.patient?.toString() !== existingConsultation.patient?.toString()) {
      return res.status(400).json({
        success: false,
        message:
          "Consultation patient does not match visit patient",
      });
    }

    if (
      existingVisit.doctor?.toString() !==
      existingConsultation.doctor?.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Consultation doctor does not match visit doctor",
      });
    }

    const existingPrescription =
      await Prescription.findOne({
        consultation,
      });

    if (existingPrescription) {
      return res.status(409).json({
        success: false,
        message:
          "Prescription already exists for this consultation",
        prescription: existingPrescription,
      });
    }

    for (const item of items) {
      if (
        !item.medicine ||
        !item.quantity ||
        !item.dosage ||
        !item.frequency ||
        !item.duration
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each prescription item must contain medicine, quantity, dosage, frequency and duration",
        });
      }

      if (Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Medicine quantity must be greater than zero",
        });
      }

      const medicine = await Medicine.findById(
        item.medicine
      );

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message:
            `Medicine not found: ${item.medicine}`,
        });
      }
    }

    const prescription =
      await Prescription.create({
        consultation,
        patient: existingConsultation.patient,
        items,
        notes: notes?.trim() || null,
        status: "Pending",
        createdBy: req.user._id,
      });

    const createdPrescription =
      await Prescription.findById(
        prescription._id
      )
        .populate(
          "patient",
          "name phone email nationalId dateOfBirth gender"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "consultation",
          "visit patient doctor symptoms diagnosis notes createdAt updatedAt"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        );

    return res.status(201).json({
      success: true,
      message:
        "Prescription created successfully",
      prescription: createdPrescription,
    });
  } catch (error) {
    console.error(
      "Create prescription error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllPrescriptions = async (req, res) => {
  try {
    const {
      patient,
      consultation,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (patient) {
      filter.patient = patient;
    }

    if (consultation) {
      filter.consultation = consultation;
    }

    if (status) {
      const allowedStatuses = [
        "Pending",
        "Partially Dispensed",
        "Dispensed",
        "Cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid prescription status",
        });
      }

      filter.status = status;
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const total =
      await Prescription.countDocuments(filter);

    const prescriptions =
      await Prescription.find(filter)
        .populate(
          "patient",
          "name phone email"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "consultation",
          "visit doctor symptoms diagnosis notes createdAt updatedAt"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      prescriptions,
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
      "Get prescriptions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getSinglePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription =
      await Prescription.findById(id)
        .populate(
          "patient",
          "name phone email nationalId dateOfBirth gender address"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "consultation",
          "visit patient doctor symptoms diagnosis notes createdAt updatedAt"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        );

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    return res.status(200).json({
      success: true,
      prescription,
    });
  } catch (error) {
    console.error(
      "Get prescription error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription =
      await Prescription.findById(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    if (prescription.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled prescription cannot be updated",
      });
    }

    if (prescription.status === "Partially Dispensed") {
      return res.status(400).json({
        success: false,
        message:
          "Partially dispensed prescription cannot be updated",
      });
    }

    if (prescription.status === "Dispensed") {
      return res.status(400).json({
        success: false,
        message:
          "Dispensed prescription cannot be updated",
      });
    }

    const existingSale =
      await Sale.findOne({
        prescription: prescription._id,
      });

    if (existingSale) {
      return res.status(400).json({
        success: false,
        message:
          "Prescription cannot be updated because a sale already exists for it",
      });
    }

    const {
      items,
      notes,
    } = req.body;

    if (items !== undefined) {
      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Prescription must contain at least one item",
        });
      }

      for (const item of items) {
        if (
          !item.medicine ||
          !item.quantity ||
          !item.dosage ||
          !item.frequency ||
          !item.duration
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Each prescription item must contain medicine, quantity, dosage, frequency and duration",
          });
        }

        if (Number(item.quantity) <= 0) {
          return res.status(400).json({
            success: false,
            message:
              "Medicine quantity must be greater than zero",
          });
        }

        const medicine =
          await Medicine.findById(
            item.medicine
          );

        if (!medicine) {
          return res.status(404).json({
            success: false,
            message:
              `Medicine not found: ${item.medicine}`,
          });
        }
      }

      prescription.items = items;
    }

    if (notes !== undefined) {
      prescription.notes =
        notes?.trim() || null;
    }

    await prescription.save();

    const updatedPrescription =
      await Prescription.findById(
        prescription._id
      )
        .populate(
          "patient",
          "name phone email"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "consultation",
          "visit patient doctor symptoms diagnosis notes createdAt updatedAt"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        );

    return res.status(200).json({
      success: true,
      message:
        "Prescription updated successfully",
      prescription: updatedPrescription,
    });
  } catch (error) {
    console.error(
      "Update prescription error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const cancelPrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription =
      await Prescription.findById(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    if (prescription.status === "Dispensed") {
      return res.status(400).json({
        success: false,
        message:
          "Dispensed prescription cannot be cancelled",
      });
    }

    if (prescription.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Prescription is already cancelled",
      });
    }

    if (
      prescription.status === "Partially Dispensed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Partially dispensed prescription cannot be cancelled",
      });
    }

    const existingSale =
      await Sale.findOne({
        prescription: prescription._id,
      });

    if (existingSale) {
      return res.status(400).json({
        success: false,
        message:
          "Prescription cannot be cancelled because a sale already exists for it",
      });
    }

    prescription.status = "Cancelled";

    await prescription.save();

    return res.status(200).json({
      success: true,
      message:
        "Prescription cancelled successfully",
      prescription,
    });
  } catch (error) {
    console.error(
      "Cancel prescription error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const dispensePrescription = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const prescription =
      await Prescription.findById(
        req.params.id
      ).session(session);

    if (!prescription) {
      throw new Error(
        "Prescription not found"
      );
    }

    if (prescription.status === "Cancelled") {
      throw new Error(
        "Cancelled prescription cannot be dispensed"
      );
    }

    if (prescription.status === "Dispensed") {
      throw new Error(
        "Prescription is already fully dispensed"
      );
    }

    const sale =
      await Sale.findOne({
        prescription: prescription._id,
      }).session(session);

    if (!sale) {
      throw new Error(
        "Prescription must be converted to a sale before dispensing"
      );
    }

    if (sale.status === "cancelled") {
      throw new Error(
        "Cancelled sale cannot be dispensed"
      );
    }

    if (
      sale.status !== "completed" ||
      sale.paymentStatus !== "paid"
    ) {
      throw new Error(
        "Prescription cannot be dispensed before the sale is fully paid"
      );
    }

    const itemsToDispense = [];

    for (const item of prescription.items) {
      const remainingQuantity =
        item.quantity -
        item.dispensedQuantity;

      if (remainingQuantity < 0) {
        throw new Error(
          `Invalid dispensed quantity for medicine ${item.medicine}`
        );
      }

      if (remainingQuantity === 0) {
        continue;
      }

      const batches =
        await MedicineBatch.find({
          medicine: item.medicine,
          isActive: true,
          quantity: { $gt: 0 },
          expiryDate: {
            $gte: new Date(),
          },
        })
          .sort({
            expiryDate: 1,
          })
          .session(session);

      const totalAvailable =
        batches.reduce(
          (total, batch) =>
            total + batch.quantity,
          0
        );

      if (
        totalAvailable <
        remainingQuantity
      ) {
        const medicine =
          await Medicine.findById(
            item.medicine
          ).session(session);

        throw new Error(
          `Insufficient stock for ${
            medicine?.name ||
            item.medicine
          }. Required: ${remainingQuantity}, Available: ${totalAvailable}`
        );
      }

      itemsToDispense.push({
        item,
        batches,
        remainingQuantity,
      });
    }

    if (itemsToDispense.length === 0) {
      throw new Error(
        "No medicines remaining to dispense"
      );
    }

    const processedItems = [];

    for (const {
      item,
      batches,
      remainingQuantity,
    } of itemsToDispense) {
      let quantityToDispense =
        remainingQuantity;

      let dispensedNow = 0;

      const transactions = [];

      for (const batch of batches) {
        if (quantityToDispense <= 0) {
          break;
        }

        const quantityFromBatch =
          Math.min(
            batch.quantity,
            quantityToDispense
          );

        batch.quantity -=
          quantityFromBatch;

        await batch.save({
          session,
        });

        await StockTransaction.create(
          [
            {
              medicine: item.medicine,
              batch: batch._id,
              type: "OUT",
              quantity: quantityFromBatch,
              reason:
                `Prescription ${prescription._id}`,
              user: req.user._id,
            },
          ],
          {
            session,
          }
        );

        transactions.push({
          batch: batch._id,
          quantity: quantityFromBatch,
          expiryDate:
            batch.expiryDate,
        });

        dispensedNow +=
          quantityFromBatch;

        quantityToDispense -=
          quantityFromBatch;
      }

      item.dispensedQuantity +=
        dispensedNow;

      processedItems.push({
        medicine: item.medicine,
        requested: item.quantity,
        dispensedNow,
        totalDispensed:
          item.dispensedQuantity,
        remaining:
          item.quantity -
          item.dispensedQuantity,
        transactions,
      });
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

    await session.commitTransaction();

    const updatedPrescription =
      await Prescription.findById(
        prescription._id
      )
        .populate(
          "patient",
          "name phone email"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "consultation",
          "visit patient doctor symptoms diagnosis notes"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        );

    return res.status(200).json({
      success: true,
      message:
        "Prescription dispensed successfully",
      status:
        updatedPrescription.status,
      prescription:
        updatedPrescription,
      processedItems,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "Dispense prescription error:",
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
const getPrescriptionByConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const prescription =
      await Prescription.findOne({
        consultation: consultationId,
      })
        .populate(
          "patient",
          "name phone email nationalId dateOfBirth gender address"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "consultation",
          "visit patient doctor symptoms diagnosis notes createdAt updatedAt"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        );

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found for this consultation",
      });
    }

    return res.status(200).json({
      success: true,
      prescription,
    });
  } catch (error) {
    console.error(
      "Get prescription by consultation error:",
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
  createPrescription,
  getAllPrescriptions,
  getSinglePrescription,
  updatePrescription,
  cancelPrescription,
  dispensePrescription,
  getPrescriptionByConsultation
};