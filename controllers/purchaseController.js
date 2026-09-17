const mongoose = require("mongoose");
const supplierModels = require("../models/supplier.models");
const purchaseModels = require("../models/purchase.models");
const medicineModels = require("../models/medicine.models");
const medicineBatchModels = require("../models/medicineBatch.models");
const stockTransactionModels = require("../models/stockTransaction.models");
const { generateBarcodeValue } = require("../utils/barcode");

// Create Purchase
const createPurchase = async (req, res) => {
  
  try {
    const { supplier, invoiceNumber, purchaseDate, items  } = req.body;
    // Validate required fields
    if ( !supplier || !invoiceNumber || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Supplier, invoice number and items are required",
        });
    }
    // Check supplier
    const existingSupplier = await supplierModels.findById(supplier);
    if (!existingSupplier) {
        return res.status(404).json({
            success: false,
            message: "Supplier not found",
        });
    }
    if (!existingSupplier.isActive) {
        return res.status(400).json({
            success: false,
            message: "Supplier is inactive",
        });
    }
    // Check duplicate invoice number
    const existingPurchase = await purchaseModels.findOne({invoiceNumber });
    if (existingPurchase) {
        return res.status(409).json({
            success: false,
            message: "Invoice number already exists",
        });
    }
    // Calculate total
    let totalAmount = 0;
      for (const item of items) {
          if (!item.medicine || !item.batchNumber || !item.quantity ||
              !item.expiryDate || item.purchasePrice === undefined) {
              return res.status(400).json({
                  success: false,
                  message: "Each item must contain medicine, batchNumber, quantity, expiryDate and purchasePrice",
              });
          }
          if (Number(item.quantity) <= 0) {
              return res.status(400).json({
                  success: false,
                  message: "Quantity must be greater than zero",
              });
          }
          if (Number(item.purchasePrice) < 0) {
              return res.status(400).json({
                  success: false,
                  message: "Purchase price cannot be negative",
              });
        }
        if (item.sellingPrice === undefined || item.sellingPrice === null) {
            throw new Error(
              `Selling price is required for medicine ${item.medicine}`
            );
        } 
        // Check medicine 
        const medicine =   await medicineModels.findById(item.medicine);
          if (!medicine) {
              return res.status(404).json({
                  success: false,
                  message: `Medicine not found: ${item.medicine}`,
              });
          }
          totalAmount +=   Number(item.quantity) * Number(item.purchasePrice);
       }
    // Create purchase
      const purchase = await purchaseModels.create({
          supplier, invoiceNumber,
          purchaseDate: purchaseDate || new Date(), items, totalAmount,
          status: "Pending", createdBy: req.user._id,
      });
      return res.status(201).json({
          success: true,
          message: "Purchase created successfully", purchase,
        });
  } catch (error) {
      return res.status(500).json({
          success: false,
          message: "Server error", error: error.message,
    });
  }
};
// Get All Purchases

const getAllPurchases = async (req, res) => {
  try {
    const { search, supplier, status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (search) filter.invoiceNumber = {$regex: search,$options: "i", } 
    if (supplier) filter.supplier = supplier;
      if (status) {
          if (!["Pending", "Confirmed", "Cancelled"].includes(status)) {
              return res.status(400).json({ success: false, message: "Invalid purchase status", });
          }
            filter.status = status;
        }
    const pageNumber = Math.max( Number(page) || 1, 1 );
    const limitNumber = Math.min( Math.max(Number(limit) || 10, 1), 100 );
    const skip = (pageNumber - 1) * limitNumber;
    const total = await purchaseModels.countDocuments(filter);
      const purchases = await purchaseModels.find(filter)
          .populate("supplier", "name phone email")
          .populate("createdBy", "name email")
          .populate("items.medicine", "name genericName manufacturer")
          .sort({ createdAt: -1 }).skip(skip).limit(limitNumber);
      return res.status(200).json({
          success: true, purchases,
          pagination: {
              page: pageNumber, limit: limitNumber, total,
              pages: Math.ceil(total / limitNumber),
          },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
    });
  }
};
const getSinglePurchase = async (req, res) => {
  try {
      const purchase = await purchaseModels.findById(req.params.id)
          .populate("supplier", "name phone email address")
          .populate("createdBy", "name email role")
          .populate("items.medicine", "name genericName manufacturer");
      if (!purchase) {
          return res.status(404)
              .json({ success: false, message: "Purchase not found", });
        }
    return res.status(200).json({ success: true, purchase });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
    });
  }
};
const cancelPurchase = async (req, res) => {
  try {
    const purchase = await purchaseModels.findById(req.params.id);
      if (!purchase) {
          return res.status(404)
              .json({ success: false, message: "Purchase not found", });
        }
      if (purchase.status === "Confirmed") {
          return res.status(400).json({ success: false, message: "Confirmed purchase cannot be cancelled", });
        }
      if (purchase.status === "Cancelled") {
          return res.status(400).json({
              success: false,
              message: "Purchase is already cancelled",
          });
        }
    purchase.status = "Cancelled";
    await purchase.save();
      return res.status(200).json({
          success: true,
          message: "Purchase cancelled successfully", purchase,
        });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
    });
  }
};
const confirmPurchase = async (req, res) => {
  const session = await mongoose.startSession();
  try {
      session.startTransaction();
      const purchase = await purchaseModels.findById(req.params.id).session(session);
    if (!purchase) { await session.abortTransaction();
        return res.status(404).json({
            success: false,
            message: "Purchase not found",
        });
    }
      if (purchase.status === "Confirmed") {
        await session.abortTransaction();
        return res.status(400).json({
            success: false,
            message: "Purchase is already confirmed",
        });
    }
      if (purchase.status === "Cancelled") {
        await session.abortTransaction();
        return res.status(400).json({
            success: false,
            message: "Cancelled purchase cannot be confirmed",
        });
    }
    for (const item of purchase.items) {
      const medicine = await medicineModels.findById(item.medicine).session(session);
      if (!medicine) throw new Error(`Medicine not found:${item.medicine}`); 
      let batch = await medicineBatchModels.findOne({ medicine: item.medicine, batchNumber: item.batchNumber })
        .session(session);
      if (batch) {
          batch.quantity += Number(item.quantity); 
          batch.expiryDate =item.expiryDate;
          batch.purchasePrice = Number(item.purchasePrice);
          batch.sellingPrice = Number(item.sellingPrice);
          batch.isActive = true;
          await batch.save({ session });
      } else {
            const createdBatch = await medicineBatchModels.create([{
              medicine: item.medicine,
              batchNumber: item.batchNumber,
              quantity: Number(item.quantity),
              expiryDate: item.expiryDate,
              purchasePrice: Number(item.purchasePrice),
              sellingPrice: Number(item.sellingPrice),
              isActive: true,
            },],
              { session });
          batch = createdBatch[0];
          
        }
        batch.barcodeValue = generateBarcodeValue({
          medicineId: item.medicine,
          batchId: batch._id,
          expiryDate: item.expiryDate,
          price: item.sellingPrice,
        });
        await batch.save({ session });
        await stockTransactionModels.create([{
              medicine: item.medicine,
              batch: batch._id, type: "IN", quantity: Number(item.quantity),
              reason: `Purchase - ${purchase.invoiceNumber}`,
              user: req.user._id,
          },], { session });
    }
    purchase.status = "Confirmed";
    await purchase.save({ session });
    await session.commitTransaction();
      return res.status(200).json({
          success: true,
          message: "Purchase confirmed successfully", purchase,
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
    });
  } finally {
    session.endSession();
  }
};


module.exports = {
  createPurchase,
  getAllPurchases,
  getSinglePurchase,
  cancelPurchase,
  confirmPurchase,
};