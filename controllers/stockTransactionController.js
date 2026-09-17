const mongoose = require("mongoose");
const medicineBatchModels = require("../models/medicineBatch.models");
const stockTransactionModels = require("../models/stockTransaction.models");



// Create Stock Transaction
const createStockTransaction = async (req, res) => {

  const session = await mongoose.startSession();

  try {
    const { batch, type, quantity, reason } = req.body;

    // Validate required fields
    if (!batch ||!type ||quantity === undefined ||!reason) {
      return res.status(400).json({
        success: false,
        message: "Batch, type, quantity and reason are required",
      });
    }

    // Validate transaction type
    if (!["IN", "OUT"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Transaction type must be IN or OUT",
      });
    }

    // Validate quantity
    if (Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero",
      });
    }

    session.startTransaction();
    
    // Find batch 
    const medicineBatch = await medicineBatchModels.findById(batch)
    .session(session);

    
    if (!medicineBatch) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Medicine batch not found",
      });
    }

    // Check batch status
    if (!medicineBatch.isActive) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "This medicine batch is inactive",
      });
    }

    // OUT
    if (type === "OUT") {
      if (medicineBatch.quantity < Number(quantity)) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Insufficient stock",
          availableQuantity: medicineBatch.quantity,
        });
      }

      medicineBatch.quantity -= Number(quantity);
    }

    // IN
    if (type === "IN") {
      medicineBatch.quantity += Number(quantity);
    }

    // Save updated batch
    await medicineBatch.save({ session });

    // Create transaction
    console.log(req.user._id);
    
    const stockTransaction = await stockTransactionModels.create(
      [
        {
          medicine: medicineBatch.medicine,
          batch: medicineBatch._id,
          type,
          quantity: Number(quantity),
          reason,
          user: req.user._id,
        },
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Stock transaction created successfully",
      transaction: stockTransaction[0],
      currentQuantity: medicineBatch.quantity,
    });

  } catch (error) {

    await session.abortTransaction();

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });

  } finally {
    session.endSession();
  }
};

const getAllStockTransactions = async (req, res) => {
  try {
    const { type, medicine, batch, page = 1, limit = 10 } = req.query;

    const filter = {};

    // Filter by transaction type
    if (type) {
      if (!["IN", "OUT"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Type must be IN or OUT",
        });
      }

      filter.type = type;
    }

    // Filter by medicine
    if (medicine)  filter.medicine = medicine;
    

    // Filter by batch
    if (batch) filter.batch = batch;
    

    // Pagination
    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min( Math.max(Number(limit) || 10, 1),100 );

    const skip = (pageNumber - 1) * limitNumber;

    // Total
    const total = await stockTransactionModels.countDocuments(filter);

    // Transactions
    const transactions = await stockTransactionModels.find(filter)
      .populate("medicine", "name genericName manufacturer")
      .populate( "batch", "batchNumber quantity expiryDate")
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
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

const getSingleStockTransactions = async (req, res) => {
  try {
    
    // Transactions
    const transactions = await stockTransactionModels.findById(req.params.id)
      .populate("medicine", "name genericName manufacturer")
      .populate( "batch", "batchNumber quantity expiryDate")
      .populate("user", "name email role")
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      transactions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}
module.exports = {
  createStockTransaction,getAllStockTransactions ,getSingleStockTransactions
};