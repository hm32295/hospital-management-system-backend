const mongoose = require("mongoose");

const medicineBatchModels = require("../models/medicineBatch.models");
const stockTransactionModels = require("../models/stockTransaction.models");

const createStockTransaction = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      batch,
      type,
      quantity,
      reason,
    } = req.body;

    if (
      !batch ||
      !type ||
      quantity === undefined ||
      !reason
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "stockTransactions.requiredFields"
        ),
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(batch)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    if (!["IN", "OUT"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "stockTransactions.invalidType"
        ),
      });
    }

    const transactionQuantity =
      Number(quantity);

    if (
      !Number.isFinite(transactionQuantity) ||
      transactionQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "stockTransactions.invalidQuantity"
        ),
      });
    }

    if (
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "stockTransactions.invalidReason"
        ),
      });
    }

    session.startTransaction();

    const medicineBatch =
      await medicineBatchModels
        .findById(batch)
        .session(session);

    if (!medicineBatch) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: req.t(
          "stockTransactions.batchNotFound"
        ),
      });
    }

    if (!medicineBatch.isActive) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: req.t(
          "stockTransactions.batchInactive"
        ),
      });
    }

    if (type === "OUT") {
      if (
        medicineBatch.quantity <
        transactionQuantity
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: req.t(
            "stockTransactions.insufficientStock"
          ),
          availableQuantity:
            medicineBatch.quantity,
        });
      }

      medicineBatch.quantity -=
        transactionQuantity;
    }

    if (type === "IN") {
      medicineBatch.quantity +=
        transactionQuantity;
    }

    await medicineBatch.save({
      session,
    });

    const stockTransaction =
      await stockTransactionModels.create(
        [
          {
            medicine:
              medicineBatch.medicine,
            batch: medicineBatch._id,
            type,
            quantity:
              transactionQuantity,
            reason: reason.trim(),
            user: req.user._id,
          },
        ],
        {
          session,
        }
      );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: req.t(
        "stockTransactions.createdSuccessfully"
      ),
      transaction:
        stockTransaction[0],
      currentQuantity:
        medicineBatch.quantity,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(
      "Create Stock Transaction Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  } finally {
    await session.endSession();
  }
};

const getAllStockTransactions = async (
  req,
  res
) => {
  try {
    const {
      type,
      medicine,
      batch,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (type) {
      if (!["IN", "OUT"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "stockTransactions.invalidType"
          ),
        });
      }

      filter.type = type;
    }

    if (medicine) {
      if (
        !mongoose.Types.ObjectId.isValid(
          medicine
        )
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "stockTransactions.invalidMedicineId"
          ),
        });
      }

      filter.medicine = medicine;
    }

    if (batch) {
      if (
        !mongoose.Types.ObjectId.isValid(batch)
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "stockTransactions.invalidBatchId"
          ),
        });
      }

      filter.batch = batch;
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
      await stockTransactionModels.countDocuments(
        filter
      );

    const transactions =
      await stockTransactionModels
        .find(filter)
        .populate(
          "medicine",
          "name genericName manufacturer"
        )
        .populate(
          "batch",
          "batchNumber quantity expiryDate"
        )
        .populate(
          "user",
          "name email role"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      transactions,
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
      "Get All Stock Transactions Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getSingleStockTransactions = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const transaction =
      await stockTransactionModels
        .findById(id)
        .populate(
          "medicine",
          "name genericName manufacturer"
        )
        .populate(
          "batch",
          "batchNumber quantity expiryDate"
        )
        .populate(
          "user",
          "name email role"
        );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "stockTransactions.transactionNotFound"
        ),
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error(
      "Get Single Stock Transaction Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

module.exports = {
  createStockTransaction,
  getAllStockTransactions,
  getSingleStockTransactions,
};