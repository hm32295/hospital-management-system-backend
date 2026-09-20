const mongoose = require("mongoose");
const medicineModels = require("../models/medicine.models");
const medicineBatchModels = require("../models/medicineBatch.models");

const {
  generateBarcodeValue,
  generateBarcodeImage,
} = require("../utils/barcode");


const createBatch = async (req, res) => {
  try {
    const {
      medicine,
      batchNumber,
      quantity,
      expiryDate,
      purchasePrice,
      sellingPrice,
    } = req.body;

    if (
      !medicine ||
      !batchNumber ||
      quantity === undefined ||
      !expiryDate ||
      purchasePrice === undefined ||
      sellingPrice === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("medicineBatches.allFieldsRequired"),
      });
    }

    if (!mongoose.Types.ObjectId.isValid(medicine)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const existingMedicine =
      await medicineModels.findById(medicine);

    if (!existingMedicine) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicineBatches.medicineNotFound"
        ),
      });
    }

    if (!existingMedicine.isActive) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "medicineBatches.medicineInactive"
        ),
      });
    }

    const normalizedBatchNumber =
      typeof batchNumber === "string"
        ? batchNumber.trim()
        : "";

    if (!normalizedBatchNumber) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "medicineBatches.invalidBatchNumber"
        ),
      });
    }

    if (
      typeof quantity !== "number" ||
      quantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "medicineBatches.invalidQuantity"
        ),
      });
    }

    if (
      typeof purchasePrice !== "number" ||
      purchasePrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "medicineBatches.invalidPurchasePrice"
        ),
      });
    }

    if (
      typeof sellingPrice !== "number" ||
      sellingPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "medicineBatches.invalidSellingPrice"
        ),
      });
    }

    const expiry = new Date(expiryDate);

    if (isNaN(expiry.getTime())) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "medicineBatches.invalidExpiryDate"
        ),
      });
    }

    const existingBatch =
      await medicineBatchModels.findOne({
        medicine,
        batchNumber: normalizedBatchNumber,
      });

    if (existingBatch) {
      return res.status(409).json({
        success: false,
        message: req.t(
          "medicineBatches.batchAlreadyExists"
        ),
      });
    }

    const batch = await medicineBatchModels.create({
      medicine,
      batchNumber: normalizedBatchNumber,
      quantity,
      expiryDate: expiry,
      purchasePrice,
      sellingPrice,
    });

    batch.barcodeValue = generateBarcodeValue({
      medicineId: medicine,
      batchId: batch._id,
      expiryDate: expiry,
      price: sellingPrice,
    });

    await batch.save();

    return res.status(201).json({
      success: true,
      message: req.t(
        "medicineBatches.batchCreatedSuccessfully"
      ),
      batch,
    });
  } catch (error) {
    console.error("Create Batch Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Get All Batches
const getAllBatches = async (req, res) => {
  try {
    const {
      search,
      medicine,
      expiryStatus,
      page = 1,
      limit = 20,
      quantity,
      isActive,
    } = req.query;

    const filter = {};

    if (medicine) {
      if (!mongoose.Types.ObjectId.isValid(medicine)) {
        return res.status(400).json({
          success: false,
          message: req.t("common.invalidId"),
        });
      }

      filter.medicine = medicine;
    }

    if (isActive !== undefined) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineBatches.invalidIsActive"
          ),
        });
      }

      filter.isActive = isActive === "true";
    }

    const today = new Date();

    if (expiryStatus === "expired") {
      filter.expiryDate = {
        $lt: today,
      };
    }

    if (expiryStatus === "valid") {
      filter.expiryDate = {
        $gte: today,
      };
    }

    if (expiryStatus === "near") {
      const next30Days = new Date();

      next30Days.setDate(
        next30Days.getDate() + 30
      );

      filter.expiryDate = {
        $gte: today,
        $lte: next30Days,
      };
    }

    if (
      expiryStatus &&
      !["expired", "valid", "near"].includes(
        expiryStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "medicineBatches.invalidExpiryStatus"
        ),
      });
    }

    if (quantity === "empty") {
      filter.quantity = {
        $lte: 0,
      };
    }

    if (quantity === "available") {
      filter.quantity = {
        $gt: 0,
      };
    }

    if (
      quantity &&
      !["empty", "available"].includes(quantity)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "medicineBatches.invalidQuantityFilter"
        ),
      });
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    let batches;
    let total;

    if (search?.trim()) {
      const searchValue = search.trim();

      const medicineSearchFilter = {
        $or: [
          {
            name: {
              $regex: searchValue,
              $options: "i",
            },
          },
          {
            genericName: {
              $regex: searchValue,
              $options: "i",
            },
          },
          {
            manufacturer: {
              $regex: searchValue,
              $options: "i",
            },
          },
        ],
      };

      const medicines =
        await medicineModels.find(
          medicineSearchFilter,
          "_id"
        );

      const medicineIds =
        medicines.map(
          (medicine) => medicine._id
        );

      const searchFilter = {
        ...filter,
        $or: [
          {
            batchNumber: {
              $regex: searchValue,
              $options: "i",
            },
          },
          {
            medicine: {
              $in: medicineIds,
            },
          },
        ],
      };

      total =
        await medicineBatchModels.countDocuments(
          searchFilter
        );

      batches =
        await medicineBatchModels
          .find(searchFilter)
          .populate(
            "medicine",
            "name genericName manufacturer"
          )
          .sort({
            expiryDate: 1,
          })
          .skip(skip)
          .limit(limitNumber);
    } else {
      total =
        await medicineBatchModels.countDocuments(
          filter
        );

      batches =
        await medicineBatchModels
          .find(filter)
          .populate(
            "medicine",
            "name genericName manufacturer"
          )
          .sort({
            expiryDate: 1,
          })
          .skip(skip)
          .limit(limitNumber);
    }

    return res.status(200).json({
      success: true,
      batches,
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
      "Get All Batches Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Get Single Batch
const getSingleBatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const batch =
      await medicineBatchModels
        .findById(id)
        .populate(
          "medicine",
          "name genericName manufacturer"
        );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicineBatches.batchNotFound"
        ),
      });
    }

    return res.status(200).json({
      success: true,
      batch,
    });
  } catch (error) {
    console.error(
      "Get Single Batch Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Update Batch
const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const batch =
      await medicineBatchModels.findById(id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicineBatches.batchNotFound"
        ),
      });
    }

    const {
      batchNumber,
      quantity,
      expiryDate,
      purchasePrice,
      sellingPrice,
      isActive,
    } = req.body;

    let finalBatchNumber =
      batch.batchNumber;

    if (batchNumber !== undefined) {
      if (
        typeof batchNumber !== "string" ||
        !batchNumber.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineBatches.invalidBatchNumber"
          ),
        });
      }

      finalBatchNumber = batchNumber.trim();
    }

    if (quantity !== undefined) {
      if (
        typeof quantity !== "number" ||
        quantity < 0
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineBatches.invalidQuantity"
          ),
        });
      }

      batch.quantity = quantity;
    }

    if (purchasePrice !== undefined) {
      if (
        typeof purchasePrice !== "number" ||
        purchasePrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineBatches.invalidPurchasePrice"
          ),
        });
      }

      batch.purchasePrice = purchasePrice;
    }

    if (sellingPrice !== undefined) {
      if (
        typeof sellingPrice !== "number" ||
        sellingPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineBatches.invalidSellingPrice"
          ),
        });
      }

      batch.sellingPrice = sellingPrice;
    }

    if (expiryDate !== undefined) {
      const expiry = new Date(expiryDate);

      if (isNaN(expiry.getTime())) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineBatches.invalidExpiryDate"
          ),
        });
      }

      batch.expiryDate = expiry;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineBatches.invalidIsActive"
          ),
        });
      }

      batch.isActive = isActive;
    }

    if (
      finalBatchNumber !== batch.batchNumber
    ) {
      const existingBatch =
        await medicineBatchModels.findOne({
          medicine: batch.medicine,
          batchNumber: finalBatchNumber,
          _id: { $ne: id },
        });

      if (existingBatch) {
        return res.status(409).json({
          success: false,
          message: req.t(
            "medicineBatches.batchAlreadyExists"
          ),
        });
      }

      batch.batchNumber =
        finalBatchNumber;
    }

    batch.barcodeValue =
      generateBarcodeValue({
        medicineId: batch.medicine,
        batchId: batch._id,
        expiryDate: batch.expiryDate,
        price: batch.sellingPrice,
      });

    await batch.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "medicineBatches.batchUpdatedSuccessfully"
      ),
      batch,
    });
  } catch (error) {
    console.error(
      "Update Batch Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Deactivate Batch
const deactivateBatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const batch =
      await medicineBatchModels.findById(id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicineBatches.batchNotFound"
        ),
      });
    }

    batch.isActive = false;

    await batch.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "medicineBatches.batchDeactivatedSuccessfully"
      ),
      batch,
    });
  } catch (error) {
    console.error(
      "Deactivate Batch Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Stock Dashboard
const getStockDashboard = async (req, res) => {
  try {
    const today = new Date();

    const next30Days = new Date();
    next30Days.setDate(
      next30Days.getDate() + 30
    );

    const lowStock =
      await medicineBatchModels
        .find({
          isActive: true,
          quantity: {
            $lte: 10,
          },
        })
        .populate(
          "medicine",
          "name genericName manufacturer"
        )
        .sort({
          quantity: 1,
        });

    const expired =
      await medicineBatchModels
        .find({
          isActive: true,
          expiryDate: {
            $lt: today,
          },
        })
        .populate(
          "medicine",
          "name genericName manufacturer"
        )
        .sort({
          expiryDate: 1,
        });

    const nearExpiry =
      await medicineBatchModels
        .find({
          isActive: true,
          expiryDate: {
            $gte: today,
            $lte: next30Days,
          },
        })
        .populate(
          "medicine",
          "name genericName manufacturer"
        )
        .sort({
          expiryDate: 1,
        });

    const totalBatches =
      await medicineBatchModels.countDocuments({
        isActive: true,
      });

    return res.status(200).json({
      success: true,
      summary: {
        totalBatches,
        lowStockCount: lowStock.length,
        expiredCount: expired.length,
        nearExpiryCount: nearExpiry.length,
      },
      lowStock,
      expired,
      nearExpiry,
    });
  } catch (error) {
    console.error(
      "Get Stock Dashboard Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Get Batch Barcode
const getBatchBarcode = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const batch =
      await medicineBatchModels.findById(id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicineBatches.batchNotFound"
        ),
      });
    }

    if (!batch.barcodeValue) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "medicineBatches.barcodeNotFound"
        ),
      });
    }

    const barcodeImage =
      await generateBarcodeImage(
        batch.barcodeValue,
        type
      );

    res.set("Content-Type", "image/png");

    return res.send(barcodeImage);
  } catch (error) {
    console.error(
      "Get Batch Barcode Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "medicineBatches.barcodeGenerationFailed"
      ),
    });
  }
};

// Generate Missing Barcodes
const generateMissingBarcode = async (
  req,
  res
) => {
  try {
    const batches =
      await medicineBatchModels.find({
        $or: [
          {
            barcodeValue: {
              $exists: false,
            },
          },
          {
            barcodeValue: null,
          },
          {
            barcodeValue: "",
          },
        ],
      });

    let updatedCount = 0;

    for (const batch of batches) {
      batch.barcodeValue =
        generateBarcodeValue({
          medicineId: batch.medicine,
          batchId: batch._id,
          expiryDate: batch.expiryDate,
          price: batch.sellingPrice,
        });

      await batch.save();

      updatedCount++;
    }

    return res.status(200).json({
      success: true,
      message: req.t(
        "medicineBatches.missingBarcodesGeneratedSuccessfully"
      ),
      updatedCount,
    });
  } catch (error) {
    console.error(
      "Generate Missing Barcode Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

module.exports = {
  createBatch,
  getAllBatches,
  getSingleBatch,
  updateBatch,
  deactivateBatch,
  getStockDashboard,
  getBatchBarcode,
  generateMissingBarcode,
};