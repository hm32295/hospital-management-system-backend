const mongoose = require("mongoose");

const supplierModels = require("../models/supplier.models");
const purchaseModels = require("../models/purchase.models");
const medicineModels = require("../models/medicine.models");
const medicineBatchModels = require("../models/medicineBatch.models");
const stockTransactionModels = require("../models/stockTransaction.models");

const {
  generateBarcodeValue,
} = require("../utils/barcode");

const purchaseStatuses = [
  "Pending",
  "Confirmed",
  "Cancelled",
];

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Create Purchase
const createPurchase = async (req, res) => {
  try {
    const {
      supplier,
      invoiceNumber,
      purchaseDate,
      items,
    } = req.body;

    if (
      !supplier ||
      !invoiceNumber ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "purchases.requiredFields"
        ),
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(supplier)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const invoice = String(invoiceNumber).trim();

    if (!invoice) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "purchases.invalidInvoiceNumber"
        ),
      });
    }

    const existingSupplier =
      await supplierModels.findById(supplier);

    if (!existingSupplier) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "purchases.supplierNotFound"
        ),
      });
    }

    if (!existingSupplier.isActive) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "purchases.supplierInactive"
        ),
      });
    }

    const existingPurchase =
      await purchaseModels.findOne({
        invoiceNumber: invoice,
      });

    if (existingPurchase) {
      return res.status(409).json({
        success: false,
        message: req.t(
          "purchases.invoiceAlreadyExists"
        ),
      });
    }

    let totalAmount = 0;
    const formattedItems = [];

    for (const item of items) {
      if (
        !item.medicine ||
        !item.batchNumber ||
        item.quantity === undefined ||
        !item.expiryDate ||
        item.purchasePrice === undefined ||
        item.sellingPrice === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.invalidItem"
          ),
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          item.medicine
        )
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.invalidMedicineId"
          ),
        });
      }

      const quantity = Number(
        item.quantity
      );

      const purchasePrice = Number(
        item.purchasePrice
      );

      const sellingPrice = Number(
        item.sellingPrice
      );

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.invalidQuantity"
          ),
        });
      }

      if (
        !Number.isFinite(purchasePrice) ||
        purchasePrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.invalidPurchasePrice"
          ),
        });
      }

      if (
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.invalidSellingPrice"
          ),
        });
      }

      const batchNumber =
        String(item.batchNumber).trim();

      if (!batchNumber) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.invalidBatchNumber"
          ),
        });
      }

      const expiryDate = new Date(
        item.expiryDate
      );

      if (isNaN(expiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.invalidExpiryDate"
          ),
        });
      }

      const medicine =
        await medicineModels.findById(
          item.medicine
        );

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: req.t(
            "purchases.medicineNotFound"
          ),
        });
      }

      if (!medicine.isActive) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.medicineInactive"
          ),
        });
      }

      formattedItems.push({
        medicine: item.medicine,
        batchNumber,
        quantity,
        expiryDate,
        purchasePrice,
        sellingPrice,
      });

      totalAmount +=
        quantity * purchasePrice;
    }

    const purchase =
      await purchaseModels.create({
        supplier,
        invoiceNumber: invoice,
        purchaseDate:
          purchaseDate || new Date(),
        items: formattedItems,
        totalAmount,
        status: "Pending",
        createdBy: req.user._id,
      });

    return res.status(201).json({
      success: true,
      message: req.t(
        "purchases.createdSuccessfully"
      ),
      purchase,
    });
  } catch (error) {
    console.error(
      "Create Purchase Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Get All Purchases
const getAllPurchases = async (
  req,
  res
) => {
  try {
    const {
      search,
      supplier,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (search?.trim()) {
      filter.invoiceNumber = {
        $regex: escapeRegex(
          search.trim()
        ),
        $options: "i",
      };
    }

    if (supplier) {
      if (
        !mongoose.Types.ObjectId.isValid(
          supplier
        )
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.invalidSupplierId"
          ),
        });
      }

      filter.supplier = supplier;
    }

    if (status) {
      if (
        !purchaseStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "purchases.invalidStatus"
          ),
        });
      }

      filter.status = status;
    }

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
      await purchaseModels.countDocuments(
        filter
      );

    const purchases =
      await purchaseModels
        .find(filter)
        .populate(
          "supplier",
          "name phone email"
        )
        .populate(
          "createdBy",
          "name email"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      purchases,
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
      "Get All Purchases Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Get Single Purchase
const getSinglePurchase = async (
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

    const purchase =
      await purchaseModels
        .findById(id)
        .populate(
          "supplier",
          "name phone email address"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "purchases.notFound"
        ),
      });
    }

    return res.status(200).json({
      success: true,
      purchase,
    });
  } catch (error) {
    console.error(
      "Get Single Purchase Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Cancel Purchase
const cancelPurchase = async (
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

    const purchase =
      await purchaseModels.findById(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "purchases.notFound"
        ),
      });
    }

    if (
      purchase.status === "Confirmed"
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "purchases.confirmedCannotCancel"
        ),
      });
    }

    if (
      purchase.status === "Cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "purchases.alreadyCancelled"
        ),
      });
    }

    purchase.status = "Cancelled";

    await purchase.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "purchases.cancelledSuccessfully"
      ),
      purchase,
    });
  } catch (error) {
    console.error(
      "Cancel Purchase Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Confirm Purchase
const confirmPurchase = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const purchase =
      await purchaseModels
        .findById(id)
        .session(session);

    if (!purchase) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: req.t(
          "purchases.notFound"
        ),
      });
    }

    if (
      purchase.status === "Confirmed"
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: req.t(
          "purchases.alreadyConfirmed"
        ),
      });
    }

    if (
      purchase.status === "Cancelled"
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: req.t(
          "purchases.cancelledCannotConfirm"
        ),
      });
    }

    for (const item of purchase.items) {
      const medicine =
        await medicineModels
          .findById(item.medicine)
          .session(session);

      if (!medicine) {
        throw new Error(
          `Medicine not found: ${item.medicine}`
        );
      }

      if (!medicine.isActive) {
        throw new Error(
          `Medicine is inactive: ${item.medicine}`
        );
      }

      let batch =
        await medicineBatchModels
          .findOne({
            medicine: item.medicine,
            batchNumber: item.batchNumber,
          })
          .session(session);

      if (batch) {
        batch.quantity += Number(
          item.quantity
        );

        batch.expiryDate =
          item.expiryDate;

        batch.purchasePrice =
          Number(item.purchasePrice);

        batch.sellingPrice =
          Number(item.sellingPrice);

        batch.isActive = true;

        batch.barcodeValue =
          generateBarcodeValue({
            medicineId: item.medicine,
            batchId: batch._id,
            expiryDate:
              item.expiryDate,
            price:
              item.sellingPrice,
          });

        await batch.save({
          session,
        });
      } else {
        const createdBatch =
          await medicineBatchModels.create(
            [
              {
                medicine:
                  item.medicine,
                batchNumber:
                  item.batchNumber,
                quantity:
                  Number(item.quantity),
                expiryDate:
                  item.expiryDate,
                purchasePrice:
                  Number(
                    item.purchasePrice
                  ),
                sellingPrice:
                  Number(
                    item.sellingPrice
                  ),
                isActive: true,
              },
            ],
            { session }
          );

        batch = createdBatch[0];

        batch.barcodeValue =
          generateBarcodeValue({
            medicineId:
              item.medicine,
            batchId: batch._id,
            expiryDate:
              item.expiryDate,
            price:
              item.sellingPrice,
          });

        await batch.save({
          session,
        });
      }

      await stockTransactionModels.create(
        [
          {
            medicine:
              item.medicine,
            batch: batch._id,
            type: "IN",
            quantity:
              Number(item.quantity),
            reason: `Purchase - ${purchase.invoiceNumber}`,
            user: req.user._id,
          },
        ],
        { session }
      );
    }

    purchase.status = "Confirmed";

    await purchase.save({
      session,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: req.t(
        "purchases.confirmedSuccessfully"
      ),
      purchase,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(
      "Confirm Purchase Error:",
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

module.exports = {
  createPurchase,
  getAllPurchases,
  getSinglePurchase,
  cancelPurchase,
  confirmPurchase,
};