const mongoose = require("mongoose");
const Medicine = require("../models/medicine.models");
const MedicineBatch = require("../models/medicineBatch.models");
const StockTransaction = require("../models/stockTransaction.models");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (page, limit) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  return { pageNumber, limitNumber, skip: (pageNumber - 1) * limitNumber };
};

const getStockOverview = async (req, res) => {
  try {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const [totalMedicines, totalBatches, quantityResult, expiredBatches, nearExpiryBatches, lowStockResult] = await Promise.all([
      Medicine.countDocuments({ isActive: true }),
      MedicineBatch.countDocuments({ isActive: true }),
      MedicineBatch.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalQuantity: { $sum: "$quantity" } } },
      ]),
      MedicineBatch.countDocuments({ isActive: true, quantity: { $gt: 0 }, expiryDate: { $lt: today } }),
      MedicineBatch.countDocuments({ isActive: true, quantity: { $gt: 0 }, expiryDate: { $gte: today, $lte: next30Days } }),
      MedicineBatch.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$medicine", totalQuantity: { $sum: "$quantity" } } },
        { $match: { totalQuantity: { $lte: 10 } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      overview: {
        totalMedicines,
        totalBatches,
        totalQuantity: quantityResult[0]?.totalQuantity || 0,
        expiredBatches,
        nearExpiryBatches,
        lowStockMedicines: lowStockResult.length,
      },
    });
  } catch (error) {
    console.error("Get Stock Overview Error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};



const getExpiryReport = async (req, res) => {
  try {
    const { days = 30, page = 1, limit = 10 } = req.query;
    const daysNumber = Number(days);

    if (!Number.isInteger(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      return res.status(400).json({ success: false, message: req.t("stock.invalidExpiryDays") });
    }

    const { pageNumber, limitNumber, skip } = getPagination(page, limit);
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysNumber);

    const filter = {
      isActive: true,
      quantity: { $gt: 0 },
      expiryDate: { $gte: today, $lte: expiryDate },
    };

    const [total, batches] = await Promise.all([
      MedicineBatch.countDocuments(filter),
      MedicineBatch.find(filter)
        .populate("medicine", "name genericName manufacturer")
        .sort({ expiryDate: 1 })
        .skip(skip)
        .limit(limitNumber),
    ]);

    return res.status(200).json({
      success: true,
      days: daysNumber,
      batches,
      pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) },
    });
  } catch (error) {
    console.error("Get Expiry Report Error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};






const getExpiredStock = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { pageNumber, limitNumber, skip } = getPagination(page, limit);

    const filter = {
      isActive: true,
      quantity: { $gt: 0 },
      expiryDate: { $lt: new Date() },
    };

    const [total, batches] = await Promise.all([
      MedicineBatch.countDocuments(filter),
      MedicineBatch.find(filter)
        .populate("medicine", "name genericName manufacturer")
        .sort({ expiryDate: 1 })
        .skip(skip)
        .limit(limitNumber),
    ]);

    return res.status(200).json({
      success: true,
      batches,
      pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) },
    });
  } catch (error) {
    console.error("Get Expired Stock Error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const getLowStock = async (req, res) => {
  try {
    const { threshold = 10, page = 1, limit = 10 } = req.query;
    const thresholdNumber = Number(threshold);

    if (!Number.isFinite(thresholdNumber) || thresholdNumber < 0) {
      return res.status(400).json({ success: false, message: req.t("stock.invalidThreshold") });
    }

    const { pageNumber, limitNumber, skip } = getPagination(page, limit);

    const match = { isActive: true };

    const result = await MedicineBatch.aggregate([
      { $match: match },
      { $group: { _id: "$medicine", totalQuantity: { $sum: "$quantity" } } },
      { $match: { totalQuantity: { $lte: thresholdNumber } } },
      { $sort: { totalQuantity: 1 } },
      { $skip: skip },
      { $limit: limitNumber },
    ]);

    const countResult = await MedicineBatch.aggregate([
      { $match: match },
      { $group: { _id: "$medicine", totalQuantity: { $sum: "$quantity" } } },
      { $match: { totalQuantity: { $lte: thresholdNumber } } },
      { $count: "total" },
    ]);

    const total = countResult[0]?.total || 0;
    const medicines = await Medicine.populate(result, { path: "_id", select: "name genericName manufacturer" });

    return res.status(200).json({
      success: true,
      threshold: thresholdNumber,
      medicines,
      pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) },
    });
  } catch (error) {
    console.error("Get Low Stock Error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const getStockTransactions = async (req, res) => {
  try {
    const { type, medicine, user, from, to, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (type !== undefined) {
      if (!["IN", "OUT"].includes(type)) {
        return res.status(400).json({ success: false, message: req.t("stock.invalidTransactionType") });
      }
      filter.type = type;
    }

    if (medicine !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(medicine)) {
        return res.status(400).json({ success: false, message: req.t("stock.invalidMedicineId") });
      }
      filter.medicine = medicine;
    }

    if (user !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        return res.status(400).json({ success: false, message: req.t("stock.invalidUserId") });
      }
      filter.user = user;
    }

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({ success: false, message: req.t("stock.invalidFromDate") });
        }
        filter.createdAt.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({ success: false, message: req.t("stock.invalidToDate") });
        }
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }

      if (filter.createdAt.$gte && filter.createdAt.$lte && filter.createdAt.$gte > filter.createdAt.$lte) {
        return res.status(400).json({ success: false, message: req.t("stock.invalidDateRange") });
      }
    }

    const { pageNumber, limitNumber, skip } = getPagination(page, limit);

    const [total, transactions] = await Promise.all([
      StockTransaction.countDocuments(filter),
      StockTransaction.find(filter)
        .populate("medicine", "name genericName manufacturer")
        .populate("batch", "batchNumber expiryDate")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
    ]);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) },
    });
  } catch (error) {
    console.error("Get Stock Transactions Error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

module.exports = { getStockOverview, getExpiryReport, getExpiredStock, getLowStock, getStockTransactions };