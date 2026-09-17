const Medicine = require("../models/medicine.models");
const MedicineBatch = require("../models/medicineBatch.models");
const StockTransaction = require("../models/stockTransaction.models");


const getStockOverview = async (req, res) => {
  try {
    const today = new Date();

    const totalMedicines =
      await Medicine.countDocuments({
        isActive: true,
      });


    const totalBatches =
      await MedicineBatch.countDocuments({
        isActive: true,
      });


    const quantityResult =
      await MedicineBatch.aggregate([
        {
          $match: {
            isActive: true,
          },
        },

        {
          $group: {
            _id: null,

            totalQuantity: {
              $sum: "$quantity",
            },
          },
        },
      ]);

    const totalQuantity =
      quantityResult[0]?.totalQuantity || 0;


    const expiredBatches =
      await MedicineBatch.countDocuments({
        isActive: true,

        quantity: {
          $gt: 0,
        },

        expiryDate: {
          $lt: today,
        },
      });


    const next30Days = new Date();

    next30Days.setDate(
      next30Days.getDate() + 30
    );

    const nearExpiryBatches =
      await MedicineBatch.countDocuments({
        isActive: true,

        quantity: {
          $gt: 0,
        },

        expiryDate: {
          $gte: today,
          $lte: next30Days,
        },
      });

    const lowStockResult =
      await MedicineBatch.aggregate([
        {
          $match: {
            isActive: true,
          },
        },

        {
          $group: {
            _id: "$medicine",

            totalQuantity: {
              $sum: "$quantity",
            },
          },
        },

        {
          $match: {
            totalQuantity: {
              $lte: 10,
            },
          },
        },
      ]);

    const lowStockMedicines =
      lowStockResult.length;


    return res.status(200).json({
      success: true,

      overview: {
        totalMedicines,
        totalBatches,
        totalQuantity,
        expiredBatches,
        nearExpiryBatches,
        lowStockMedicines,
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


const getExpiryReport = async (req, res) => {
  try {
    const {
      days = 30,
      page = 1,
      limit = 10,
    } = req.query;

    const daysNumber = Math.min(Math.max(Number(days) || 30, 1),365);

    const pageNumber = Math.max(Number(page) || 1,1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1),100);

    const today = new Date();

    const expiryDate = new Date();

    expiryDate.setDate(expiryDate.getDate() + daysNumber);

    const filter = {
      isActive: true,
      quantity: { $gt: 0,},
      expiryDate: { $gte: today,$lte: expiryDate,},
    };

    const skip =(pageNumber - 1) * limitNumber;

    const total = await MedicineBatch.countDocuments(filter);

    const batches = await MedicineBatch.find(filter)
        .populate("medicine","name genericName manufacturer")
        .sort({ expiryDate: 1,})
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,

      days: daysNumber,

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


const getExpiredStock = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const today = new Date();

    const filter = {
      isActive: true,

      quantity: {
        $gt: 0,
      },

      expiryDate: {
        $lt: today,
      },
    };

    const skip =
      (pageNumber - 1) * limitNumber;

    const total =
      await MedicineBatch.countDocuments(filter);

    const batches =
      await MedicineBatch.find(filter)
        .populate(
          "medicine",
          "name genericName manufacturer"
        )
        .sort({
          expiryDate: 1,
        })
        .skip(skip)
        .limit(limitNumber);

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


const getLowStock = async (req, res) => {
  try {
    const { threshold = 10, page = 1, limit = 10 } = req.query;

    const thresholdNumber = Math.max( Number(threshold) || 10,0);

    const pageNumber = Math.max( Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1),100);

    // Calculate total quantity per medicine
    const result = await MedicineBatch.aggregate([
        {$match: {isActive: true }},
        {$group: { _id: "$medicine",totalQuantity: {$sum: "$quantity" }} },
        {$match: {totalQuantity: { $lte: thresholdNumber} } },
        {$sort: { totalQuantity: 1}},
        {$skip:(pageNumber - 1) *limitNumber, },
        {$limit: limitNumber}
      ]);

    // Get total count separately
    const countResult = await MedicineBatch.aggregate([
        {$match: {isActive: true }},
        {$group: { _id: "$medicine", totalQuantity: {$sum: "$quantity"  }}},
        {$match: { totalQuantity: { $lte: thresholdNumber }} },
        {$count: "total"},
      ]);

    const total =countResult[0]?.total || 0;

    const medicines = await Medicine.populate(
        result, {path: "_id",select: "name genericName manufacturer" }
      );

    return res.status(200).json({
      success: true,
      threshold: thresholdNumber,
      medicines,
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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


const getStockTransactions = async (
  req,
  res
) => {
  try {
    const {
      type,
      medicine,
      user,
      from,
      to,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // ---------------------------------------------
    // Type Filter
    // ---------------------------------------------

    if (type) {
      if (!["IN", "OUT"].includes(type)) {
        return res.status(400).json({
          success: false,
          message:
            "Type must be IN or OUT",
        });
      }

      filter.type = type;
    }

    // ---------------------------------------------
    // Medicine Filter
    // ---------------------------------------------

    if (medicine) {
      filter.medicine = medicine;
    }

    // ---------------------------------------------
    // User Filter
    // ---------------------------------------------

    if (user) {
      filter.user = user;
    }

    // ---------------------------------------------
    // Date Filter
    // ---------------------------------------------

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        filter.createdAt.$gte =
          new Date(from);
      }

      if (to) {
        const toDate = new Date(to);

        toDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte =
          toDate;
      }
    }

    // ---------------------------------------------
    // Pagination
    // ---------------------------------------------

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const total =
      await StockTransaction.countDocuments(
        filter
      );

    const transactions =
      await StockTransaction.find(filter)
        .populate(
          "medicine",
          "name genericName manufacturer"
        )
        .populate(
          "batch",
          "batchNumber expiryDate"
        )
        .populate(
          "user",
          "name email"
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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = {
  getStockOverview,
  getExpiryReport,
  getExpiredStock,
  getLowStock,
  getStockTransactions,
};