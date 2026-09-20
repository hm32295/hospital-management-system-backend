const mongoose = require("mongoose");
const cashDrawerModels = require("../models/cashDrawer.models");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Number(amount.toFixed(2)) : null;
};

const openCashDrawer = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { openingBalance = 0, notes = "" } = req.body;
    const balance = parseAmount(openingBalance);

    if (balance === null) {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.invalidOpeningBalance") });
    }

    if (typeof notes !== "string") {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.invalidNotes") });
    }

    session.startTransaction();

    const existingOpenDrawer = await cashDrawerModels.findOne({ status: "open" }).session(session);

    if (existingOpenDrawer) {
      return res.status(409).json({ success: false, message: req.t("cashDrawers.alreadyOpen") });
    }

    const drawer = await cashDrawerModels.create([{
      openedBy: req.user._id,
      openingBalance: balance,
      expectedCash: balance,
      actualCash: 0,
      difference: 0,
      status: "open",
      openedAt: new Date(),
      notes: notes.trim(),
    }], { session });

    await session.commitTransaction();

    const createdDrawer = await cashDrawerModels.findById(drawer[0]._id)
      .populate("openedBy", "name email role")
      .populate("closedBy", "name email role");

    return res.status(201).json({
      success: true,
      message: req.t("cashDrawers.openedSuccessfully"),
      cashDrawer: createdDrawer,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Open cash drawer error:", error);
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: req.t("cashDrawers.alreadyOpen") });
    }
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  } finally {
    await session.endSession();
  }
};

const getCurrentCashDrawer = async (req, res) => {
  try {
    const drawer = await cashDrawerModels.findOne({ status: "open" })
      .populate("openedBy", "name email role")
      .populate("closedBy", "name email role");

    if (!drawer) {
      return res.status(404).json({ success: false, message: req.t("cashDrawers.notFoundOpen") });
    }

    return res.status(200).json({
      success: true,
      cashDrawer: drawer,
    });
  } catch (error) {
    console.error("Get current cash drawer error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const closeCashDrawer = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { actualCash, notes } = req.body;

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.invalidId") });
    }

    const actual = parseAmount(actualCash);

    if (actual === null) {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.invalidActualCash") });
    }

    if (notes !== undefined && typeof notes !== "string") {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.invalidNotes") });
    }

    session.startTransaction();

    const drawer = await cashDrawerModels.findById(req.params.id).session(session);

    if (!drawer) {
      return res.status(404).json({ success: false, message: req.t("cashDrawers.notFound") });
    }

    if (drawer.status !== "open") {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.alreadyClosed") });
    }

    const difference = Number((actual - drawer.expectedCash).toFixed(2));

    drawer.actualCash = actual;
    drawer.difference = difference;
    drawer.status = "closed";
    drawer.closedBy = req.user._id;
    drawer.closedAt = new Date();

    if (notes !== undefined) {
      drawer.notes = notes.trim();
    }

    await drawer.save({ session });
    await session.commitTransaction();

    const closedDrawer = await cashDrawerModels.findById(drawer._id)
      .populate("openedBy", "name email role")
      .populate("closedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: req.t("cashDrawers.closedSuccessfully"),
      cashDrawer: closedDrawer,
      summary: {
        openingBalance: closedDrawer.openingBalance,
        expectedCash: closedDrawer.expectedCash,
        actualCash: closedDrawer.actualCash,
        difference: closedDrawer.difference,
      },
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Close cash drawer error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  } finally {
    await session.endSession();
  }
};

const getAllCashDrawers = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    if (status && !["open", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.invalidStatus") });
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.invalidPage") });
    }

    if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.invalidLimit") });
    }

    const filter = {};
    if (status) filter.status = status;

    const skip = (pageNumber - 1) * limitNumber;

    const [total, drawers] = await Promise.all([
      cashDrawerModels.countDocuments(filter),
      cashDrawerModels.find(filter)
        .populate("openedBy", "name email role")
        .populate("closedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
    ]);

    return res.status(200).json({
      success: true,
      cashDrawers: drawers,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get all cash drawers error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

const getSingleCashDrawer = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: req.t("cashDrawers.invalidId") });
    }

    const drawer = await cashDrawerModels.findById(req.params.id)
      .populate("openedBy", "name email role")
      .populate("closedBy", "name email role");

    if (!drawer) {
      return res.status(404).json({ success: false, message: req.t("cashDrawers.notFound") });
    }

    return res.status(200).json({
      success: true,
      cashDrawer: drawer,
    });
  } catch (error) {
    console.error("Get single cash drawer error:", error);
    return res.status(500).json({ success: false, message: req.t("common.serverError") });
  }
};

module.exports = {
  openCashDrawer,
  getCurrentCashDrawer,
  closeCashDrawer,
  getAllCashDrawers,
  getSingleCashDrawer,
};