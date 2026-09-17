const mongoose = require("mongoose");

const cashDrawerModels = require("../models/cashDrawer.models");


// ==========================================
// Open Cash Drawer
// ==========================================
const openCashDrawer = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      openingBalance = 0,
      notes = "",
    } = req.body;

    // ==========================================
    // Validate Opening Balance
    // ==========================================

    const balance = Number(openingBalance);

    if (
      !Number.isFinite(balance) ||
      balance < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Opening balance cannot be negative",
      });
    }

    session.startTransaction();

    // ==========================================
    // Check Existing Open Drawer
    // ==========================================

    const existingOpenDrawer =
      await cashDrawerModels
        .findOne({
          status: "open",
        })
        .session(session);

    if (existingOpenDrawer) {
      throw new Error(
        "There is already an open cash drawer"
      );
    }

    // ==========================================
    // Create Cash Drawer
    // ==========================================

    const drawer =
      await cashDrawerModels.create(
        [
          {
            openedBy: req.user._id,

            openingBalance: balance,

            expectedCash: balance,

            actualCash: 0,

            difference: 0,

            status: "open",

            openedAt: new Date(),

            notes,
          },
        ],
        {
          session,
        }
      );

    await session.commitTransaction();

    // ==========================================
    // Get Created Drawer
    // ==========================================

    const createdDrawer =
      await cashDrawerModels
        .findById(drawer[0]._id)
        .populate(
          "openedBy",
          "name email role"
        );

    return res.status(201).json({
      success: true,

      message:
        "Cash drawer opened successfully",

      cashDrawer:
        createdDrawer,
    });

  } catch (error) {

    await session.abortTransaction();

    console.error(
      "Open cash drawer error:",
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


// ==========================================
// Get Current Open Cash Drawer
// ==========================================
const getCurrentCashDrawer = async (
  req,
  res
) => {
  try {

    const drawer =
      await cashDrawerModels
        .findOne({
          status: "open",
        })
        .populate(
          "openedBy",
          "name email role"
        );

    if (!drawer) {
      return res.status(404).json({
        success: false,
        message:
          "No open cash drawer found",
      });
    }

    return res.status(200).json({
      success: true,

      cashDrawer: drawer,
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
// Close Cash Drawer
// ==========================================
const closeCashDrawer = async (
  req,
  res
) => {
  const session = await mongoose.startSession();

  try {

    const {
      actualCash,
      notes,
    } = req.body;

    // ==========================================
    // Validate Actual Cash
    // ==========================================

    const actual =
      Number(actualCash);

    if (
      !Number.isFinite(actual) ||
      actual < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Actual cash cannot be negative",
      });
    }

    session.startTransaction();

    // ==========================================
    // Find Drawer
    // ==========================================

    const drawer =
      await cashDrawerModels
        .findById(req.params.id)
        .session(session);

    if (!drawer) {
      throw new Error(
        "Cash drawer not found"
      );
    }

    // ==========================================
    // Check Status
    // ==========================================

    if (
      drawer.status !== "open"
    ) {
      throw new Error(
        "Cash drawer is already closed"
      );
    }

    // ==========================================
    // Calculate Difference
    // ==========================================

    const difference =
      Number(
        (
          actual -
          drawer.expectedCash
        ).toFixed(2)
      );

    // ==========================================
    // Update Drawer
    // ==========================================

    drawer.actualCash = actual;

    drawer.difference =
      difference;

    drawer.status =
      "closed";

    drawer.closedBy =
      req.user._id;

    drawer.closedAt =
      new Date();

    if (
      notes !== undefined
    ) {
      drawer.notes = notes;
    }

    await drawer.save({
      session,
    });

    await session.commitTransaction();

    // ==========================================
    // Get Closed Drawer
    // ==========================================

    const closedDrawer =
      await cashDrawerModels
        .findById(drawer._id)
        .populate(
          "openedBy",
          "name email role"
        )
        .populate(
          "closedBy",
          "name email role"
        );

    return res.status(200).json({
      success: true,

      message:
        "Cash drawer closed successfully",

      cashDrawer:
        closedDrawer,

      summary: {
        openingBalance:
          closedDrawer.openingBalance,

        expectedCash:
          closedDrawer.expectedCash,

        actualCash:
          closedDrawer.actualCash,

        difference:
          closedDrawer.difference,
      },
    });

  } catch (error) {

    await session.abortTransaction();

    console.error(
      "Close cash drawer error:",
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


// ==========================================
// Get All Cash Drawers
// ==========================================
const getAllCashDrawers = async (
  req,
  res
) => {
  try {

    const {
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    // ==========================================
    // Pagination
    // ==========================================

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

    // ==========================================
    // Total
    // ==========================================

    const total =
      await cashDrawerModels
        .countDocuments(filter);

    // ==========================================
    // Drawers
    // ==========================================

    const drawers =
      await cashDrawerModels
        .find(filter)
        .populate(
          "openedBy",
          "name email role"
        )
        .populate(
          "closedBy",
          "name email role"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,

      cashDrawers:
        drawers,

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


// ==========================================
// Get Single Cash Drawer
// ==========================================
const getSingleCashDrawer = async (
  req,
  res
) => {
  try {

    const drawer =
      await cashDrawerModels
        .findById(req.params.id)
        .populate(
          "openedBy",
          "name email role"
        )
        .populate(
          "closedBy",
          "name email role"
        );

    if (!drawer) {
      return res.status(404).json({
        success: false,
        message:
          "Cash drawer not found",
      });
    }

    return res.status(200).json({
      success: true,

      cashDrawer: drawer,
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
  openCashDrawer,
  getCurrentCashDrawer,
  closeCashDrawer,
  getAllCashDrawers,
  getSingleCashDrawer,
};