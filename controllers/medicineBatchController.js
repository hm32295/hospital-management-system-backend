const medicineModels = require("../models/medicine.models");
const medicineBatchModels = require("../models/medicineBatch.models");

const {generateBarcodeValue, generateBarcodeImage} = require("../utils/barcode");
// Create Batch
const createBatch = async (req, res) => {
  
  try {
    const { medicine, batchNumber, quantity, expiryDate, purchasePrice, sellingPrice} = req.body;
    
    // Validate required fields
      if (!medicine || !batchNumber || quantity === undefined || !expiryDate ||
        purchasePrice === undefined || sellingPrice === undefined) {
          return res.status(400)
          .json({ success: false, message: "All fields are required", });
        }
        
        // Check medicine exists
        const existingMedicine = await medicineModels.findById(medicine);
        if (!existingMedicine) {
          return res.status(404)
          .json({ success: false, message: "Medicine not found", });
        }
        
        // Check quantity
        if (quantity < 0) {
          return res.status(400)
          .json({success: false, message: "Quantity cannot be negative", });
        }
        
        // Check prices
        if (purchasePrice < 0 || sellingPrice < 0) {
          return res.status(400)
          .json({success: false, message: "Prices cannot be negative", });
        }
        // Check expiry date
        const expiry = new Date(expiryDate);
        
        if (isNaN(expiry.getTime())) {
          return res.status(400)
          .json({ success: false, message: "Invalid expiry date", });
        }
        const batch = await medicineBatchModels.create({
          medicine, batchNumber, quantity, expiryDate: expiry,
          purchasePrice,sellingPrice,});
          
          console.log('test');
// Generate barcode value
    const barcodeValue = generateBarcodeValue({
      medicineId: medicine,
      batchId: batch._id,
      expiryDate: expiry,
      price: sellingPrice,
    });

    batch.barcodeValue = barcodeValue;

    await batch.save();
    return res.status(201).json({
      success: true, message: "Medicine batch created successfully", batch,
    });
  } catch (error) {
     console.error("CREATE BATCH ERROR:", error);
    return res.status(500)
    .json({ success: false, message: "Server error", error: error.message,
    });
  }
};

// Get All Batches

const getAllBatches = async (req, res) => {
  console.log('batches');
  try{
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
      filter.medicine = medicine;
    }

    if (isActive !== undefined) {
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

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip =(pageNumber - 1) * limitNumber;

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
      "GET ALL BATCHES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Single Batch
const getSingleBatch = async (req, res) => {
  try {

      const batch = await medicineBatchModels.findById(req.params.id)
          .populate("medicine", "name genericName manufacturer"
    );

    if (!batch) { return res.status(404)
        .json({   success: false,   message: "Batch not found", });
    }

    return res.status(200)
    .json({ success: true, batch,
    });
  } catch (error) {
    return res.status(500)
    .json({ success: false, message: "Server error", error: error.message,
    });
  }
};

// Update Batch
const updateBatch = async (req, res) => {
  try {

    const batch = await medicineBatchModels.findById(req.params.id);

    if (!batch) { return res.status(404)
        .json({   success: false,   message: "Batch not found", });
    }

    const { batchNumber, quantity, expiryDate, purchasePrice, sellingPrice ,isActive} = req.body;


    if (quantity !== undefined && quantity < 0) { return res.status(400)
        .json({   success: false,   message: "Quantity cannot be negative", });
    }

    if ( purchasePrice !== undefined && purchasePrice < 0
    ) { return res.status(400)
        .json({   success: false,   message: "Purchase price cannot be negative", });
    }

    if ( sellingPrice !== undefined && sellingPrice < 0
    ) { return res.status(400)
        .json({   success: false,   message: "Selling price cannot be negative", });
    }

    if (expiryDate !== undefined) {
      const expiry = new Date(expiryDate);
        if (isNaN(expiry.getTime())) {
            return res.status(400)
                .json({ success: false, message: "Invalid expiry date" });
        }
        batch.expiryDate = expiry;
    }

    if (batchNumber !== undefined)  batch.batchNumber = batchNumber;
    if (quantity !== undefined)  batch.quantity = quantity
    if (purchasePrice !== undefined)  batch.purchasePrice = purchasePrice;
    if (sellingPrice !== undefined)  batch.sellingPrice = sellingPrice;
    if (isActive !== undefined) batch.isActive = isActive;
    const barcodeValue = generateBarcodeValue({
      medicineId: batch.medicine,
      batchId: batch._id,
      expiryDate: batch.expiryDate,
      price: batch.sellingPrice,
    });

    batch.barcodeValue = barcodeValue;
    await batch.save();

    return res.status(200)
    .json({ success: true, message: "Batch updated successfully", batch });
  } catch (error) {
    return res.status(500)
    .json({ success: false, message: "Server error", error: error.message,
    });
  }
};

// Deactivate Batch
const deactivateBatch = async (req, res) => {
  try {

    const batch = await medicineBatchModels.findById(req.params.id);

    if (!batch) { return res.status(404)
        .json({   success: false,   message: "Batch not found", });
    }

    batch.isActive = false;

    await batch.save();

    return res.status(200)
        .json({ success: true, message: "Batch deactivated successfully", batch });
  } catch (error) {
    return res.status(500)
    .json({ success: false, message: "Server error", error: error.message,
    });
  }
};


const getStockDashboard = async (req, res) => {
  try {
    const today = new Date();
    // Near expiry = next 30 days
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    // Low stock
    const lowStock = await medicineBatchModels.find({isActive: true,  quantity: {$lte: 10 }})
      .populate("medicine", "name genericName manufacturer")
      .sort({ quantity: 1 });

    // Expired
    const expired = await medicineBatchModels.find({ isActive: true, expiryDate:{$lt:today}})
      .populate("medicine", "name genericName manufacturer")
      .sort({ expiryDate: 1 });

    // Near expiry
    const nearExpiry = await medicineBatchModels.find({
      isActive: true,
      expiryDate: { $gte: today, $lte: next30Days}
    })
      .populate("medicine", "name genericName manufacturer")
      .sort({ expiryDate: 1 });

    // Total active batches
    const totalBatches = await medicineBatchModels.countDocuments({ isActive: true});

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getBatchBarcode = async (req, res) => {
  const { type } = req.query
 
  
  try {
    const { id } = req.params;
    const batch = await medicineBatchModels.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    if (!batch.barcodeValue) {
      return res.status(400).json({
        success: false,
        message: "Barcode not found for this batch",
      });
    }

    const barcodeImage = await generateBarcodeImage( batch.barcodeValue,type);
    res.set("Content-Type", "image/png");
    return res.send(barcodeImage);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate barcode",
      error: error.message,
    });
  }
};


const generateMissingBarcode = async (req, res) => {
  try {
    const batches = await medicineBatchModels.find({
      $or: [
        { barcodeValue: { $exists: false } },
        { barcodeValue: null },
        { barcodeValue: "" },
      ],
    });

    let updatedCount = 0;

    for (const batch of batches) {
      batch.barcodeValue = generateBarcodeValue({
        medicineId: batch.medicine,
        batchId: batch._id,
        expiryDate: batch.expiryDate,
      });

      await batch.save();

      updatedCount++;
    }

    return res.status(200).json({
      success: true,
      message: "Missing barcode generated successfully",
      updatedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
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
  generateMissingBarcode
};