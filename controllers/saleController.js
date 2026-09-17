const mongoose = require("mongoose");

const saleModels = require("../models/sale.models");
const medicineModels = require("../models/medicine.models");
const medicineBatchModels = require("../models/medicineBatch.models");
const patientModels = require("../models/patient.models");
const prescriptionModels = require("../models/prescription.models");


const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { patient, items, discount = 0, notes = "",} = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,message: "Sale must contain at least one medicine",
      });
    }

    const discountValue = Number(discount);
    if (!Number.isFinite(discountValue) ||discountValue < 0 ) {
      return res.status(400).json({
        success: false,message: "Invalid discount",
      });
    }

    session.startTransaction();

    let patientId = null;
    if (patient) {
      const existingPatient =await patientModels.findById(patient).session(session);
      if (!existingPatient) throw new Error("Patient not found");
      patientId = existingPatient._id;
    }

    const saleItems = [];
    let subtotal = 0;
    for (const item of items) {
      const { medicine, batch, quantity} = item;
      if (!medicine || !batch || !quantity) throw new Error("Medicine, batch and quantity are required");
      
      const requestedQuantity = Number(quantity);

      if (!Number.isFinite(requestedQuantity) ||requestedQuantity <= 0) {
        throw new Error("Quantity must be greater than zero");
      }

      const existingMedicine = await medicineModels.findById(medicine).session(session);

      if (!existingMedicine) { throw new Error("Medicine not found");}
      const existingBatch = await medicineBatchModels .findById(batch).session(session);

      if (!existingBatch) {
        throw new Error(`Batch not found for ${existingMedicine.name}` );
      }

      if ( existingBatch.medicine.toString() !== existingMedicine._id.toString() ) {
        throw new Error(`Batch does not belong to ${existingMedicine.name}`);
      }

      if (!existingBatch.isActive) {
        throw new Error(`Batch ${existingBatch.batchNumber} is inactive`);
      }

      const today = new Date();
      if ( existingBatch.expiryDate < today ) {
        throw new Error( `Batch ${existingBatch.batchNumber} has expired`);
      }
      if ( existingBatch.quantity <requestedQuantity ) {
        throw new Error(
          `Insufficient stock for ${existingMedicine.name}. Available: ${existingBatch.quantity}`
        );
      }

      const unitPrice =existingBatch.sellingPrice;

      const itemTotal = requestedQuantity * unitPrice;

      saleItems.push({
        medicine: existingMedicine._id, batch: existingBatch._id,
        quantity: requestedQuantity, unitPrice, total: itemTotal,
      });

      subtotal += itemTotal;
    }

    if (discountValue > subtotal) {
      throw new Error("Discount cannot be greater than subtotal");
    }

    const totalAmount =subtotal - discountValue;
    const paidAmount = 0;

    const remainingAmount = totalAmount;

    const paymentStatus =totalAmount === 0 ? "paid": "unpaid";

    const sale =await saleModels.create(
        [
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
            notes,
          },
        ],
        {
          session,
        }
      );

    // ==========================================
    // Commit
    // ==========================================

    await session.commitTransaction();

    // ==========================================
    // Populate Sale
    // ==========================================

    const populatedSale = await saleModels.findById(sale[0]._id)
        .populate("patient","name phone")
        .populate("createdBy","name email role" )
        .populate("items.medicine","name genericName manufacturer" )
        .populate("items.batch","batchNumber expiryDate sellingPrice");

    
    return res.status(201).json({
      success: true,
      message: "Sale created successfully",
      sale: populatedSale,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Create sale error:",error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });

  } finally {
    await session.endSession();
  }
};


const getAllSales = async (req, res) => {
  try {
    const {patient,paymentStatus,status,page = 1,limit = 10} = req.query;

    const filter = {};

    if (patient) {
      filter.patient = patient;
    }

    if (paymentStatus) {
      filter.paymentStatus =
        paymentStatus;
    }

    if (status) {
      filter.status = status;
    }


    const pageNumber = Math.max( Number(page) || 1,1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10,1 ),100);

    const skip =(pageNumber - 1) * limitNumber;

    const total =await saleModels.countDocuments(filter);

    const sales = await saleModels.find(filter)
        .populate("patient","name phone")
        .populate("createdBy","name email role")
        .populate("items.medicine","name genericName manufacturer")
      .populate("items.batch", "batchNumber expiryDate sellingPrice")
      .populate("prescription","status notes consultation"
)
        .sort({createdAt: -1,})
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,sales,
      pagination: {page: pageNumber,limit: limitNumber,total,pages: Math.ceil(total/limitNumber),
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getSingleSale = async (req, res) => {
  try {
    const sale =
      await saleModels.findById(req.params.id).populate("patient","name phone")
        .populate("createdBy", "name email role")
        .populate("prescription","status notes consultation")
        .populate("items.medicine","name genericName manufacturer")
        .populate("items.batch","batchNumber expiryDate sellingPrice");

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    return res.status(200).json({
      success: true,
      sale,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// ==========================================
// Get Patient Sales
// ==========================================
const getPatientSales = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await patientModels.findById(patientId);

    if (!patient) return res.status(404).json({success: false, message: "Patient not found", })

    const sales = await saleModels.find({ patient: patientId })
      .populate("createdBy", "name role")
      .populate("items.medicine", "name genericName manufacturer")
      .populate("items.batch", "batchNumber expiryDate")
      .sort({ createdAt: -1, });

   
    const summary = sales.reduce((acc, sale) => {
      acc.totalSales += sale.totalAmount;
      acc.totalPaid +=sale.paidAmount;
      acc.totalRemaining += sale.remainingAmount;
      return acc;
    }, { totalSales: 0, totalPaid: 0, totalRemaining: 0, });

    return res.status(200).json({ success: true,patient,summary,sales});

  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
    });
  }
};

const createSaleFromPrescription = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { prescriptionId } = req.params;
    const { discount = 0, notes = "" } = req.body;

    session.startTransaction();

    const prescription =
      await prescriptionModels
        .findById(prescriptionId)
        .populate("patient", "name phone")
        .session(session);

    if (!prescription) {
      throw new Error("Prescription not found");
    }

    if (prescription.status === "Cancelled") {
      throw new Error(
        "Cancelled prescription cannot be converted to sale"
      );
    }

    if (prescription.status === "Dispensed") {
      throw new Error(
        "Fully dispensed prescription cannot be converted to sale"
      );
    }

    const existingSale =
      await saleModels.findOne({
        prescription: prescription._id,
      }).session(session);

    if (existingSale) {
      throw new Error(
        "A sale already exists for this prescription"
      );
    }

    const discountValue = Number(discount);

    if (
      !Number.isFinite(discountValue) ||
      discountValue < 0
    ) {
      throw new Error("Invalid discount");
    }

    const saleItems = [];
    let subtotal = 0;

    for (const item of prescription.items) {
      const remainingQuantity =
        item.quantity - item.dispensedQuantity;

      if (remainingQuantity <= 0) {
        continue;
      }

      const medicine =
        await medicineModels
          .findById(item.medicine)
          .session(session);

      if (!medicine) {
        throw new Error(
          `Medicine not found: ${item.medicine}`
        );
      }

      const batches =
        await medicineBatchModels
          .find({
            medicine: medicine._id,
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
        totalAvailable < remainingQuantity
      ) {
        throw new Error(
          `Insufficient stock for ${medicine.name}. Required: ${remainingQuantity}, Available: ${totalAvailable}`
        );
      }

      let quantityToAdd =
        remainingQuantity;

      for (const batch of batches) {
        if (quantityToAdd <= 0) {
          break;
        }

        const quantityFromBatch =
          Math.min(
            batch.quantity,
            quantityToAdd
          );

        const unitPrice =
          batch.sellingPrice;

        const itemTotal =
          quantityFromBatch * unitPrice;

        saleItems.push({
          medicine: medicine._id,
          batch: batch._id,
          quantity: quantityFromBatch,
          unitPrice,
          total: itemTotal,
        });

        subtotal += itemTotal;

        quantityToAdd -=
          quantityFromBatch;
      }
    }

    if (saleItems.length === 0) {
      throw new Error(
        "No available medicines remaining in prescription"
      );
    }

    if (discountValue > subtotal) {
      throw new Error(
        "Discount cannot be greater than subtotal"
      );
    }

    const totalAmount =
      subtotal - discountValue;

    const paidAmount = 0;

    const remainingAmount =
      totalAmount;

    const paymentStatus =
      totalAmount === 0
        ? "paid"
        : "unpaid";

    const sale = await saleModels.create(
      [
        {
          prescription:
            prescription._id,

          patient:
            prescription.patient?._id ||
            prescription.patient,

          createdBy: req.user._id,

          items: saleItems,

          subtotal,

          discount: discountValue,

          totalAmount,

          paidAmount,

          remainingAmount,

          paymentStatus,

          status: "pending",

          notes,
        },
      ],
      {
        session,
      }
    );

    await session.commitTransaction();

    const populatedSale =
      await saleModels
        .findById(sale[0]._id)
        .populate(
          "prescription",
          "status notes consultation"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        )
        .populate(
          "items.batch",
          "batchNumber expiryDate sellingPrice"
        );

    return res.status(201).json({
      success: true,
      message:
        "Sale created from prescription successfully",
      sale: populatedSale,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "Create sale from prescription error:",
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

const getSaleByPrescription = async (req, res) => {
  try {
    const { prescriptionId } =
      req.params;

    const sale =
      await saleModels
        .findOne({
          prescription: prescriptionId,
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
          "createdBy",
          "name email role"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        )
        .populate(
          "items.batch",
          "batchNumber expiryDate sellingPrice"
        );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          "Sale not found for this prescription",
      });
    }

    return res.status(200).json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error(
      "Get sale by prescription error:",
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
  createSale,
  getAllSales,
  getSingleSale,
  getPatientSales,
  createSaleFromPrescription,
  getSaleByPrescription
};