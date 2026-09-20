const mongoose = require("mongoose");
const doctorSettlementModels = require("../models/doctorSettlementModel");
const operationModels = require("../models/operation.model");
const cashDrawerModels = require("../models/cashDrawer.models");
const cashTransactionModels = require("../models/cashTransaction.model");
const doctorModel = require("../models/doctor.model");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getPagination = (query) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    return { error: "invalidPage" };
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { error: "invalidLimit" };
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const createDoctorSettlement = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { doctor, operation, amount, notes = "" } = req.body;

    if (!doctor || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.doctorAndAmountRequired"),
      });
    }

    if (!isValidId(doctor)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.invalidDoctorId"),
      });
    }

    if (operation && !isValidId(operation)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.invalidOperationId"),
      });
    }

    if (typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.invalidNotes"),
      });
    }

    const settlementAmount = Number(amount);

    if (!Number.isFinite(settlementAmount) || settlementAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.invalidAmount"),
      });
    }

    const roundedAmount = Math.round((settlementAmount + Number.EPSILON) * 100) / 100;

    const doctorExists = await doctorModel.findById(doctor).select("_id name isActive");

    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: req.t("doctorSettlements.doctorNotFound"),
      });
    }

    if (!doctorExists.isActive) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.doctorInactive"),
      });
    }

    let operationExists = null;

    if (operation) {
      operationExists = await operationModels.findById(operation).select(
        "_id doctor patient status doctorFeeAmount"
      );

      if (!operationExists) {
        return res.status(404).json({
          success: false,
          message: req.t("doctorSettlements.operationNotFound"),
        });
      }

      if (!operationExists.doctor || operationExists.doctor.toString() !== doctorExists._id.toString()) {
        return res.status(400).json({
          success: false,
          message: req.t("doctorSettlements.operationDoctorMismatch"),
        });
      }

      if (operationExists.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: req.t("doctorSettlements.cancelledOperation"),
        });
      }

      if (Number(operationExists.doctorFeeAmount || 0) <= 0) {
        return res.status(400).json({
          success: false,
          message: req.t("doctorSettlements.operationHasNoDoctorFee"),
        });
      }
    }

    const operations = await operationModels.find({
      doctor: doctorExists._id,
      status: { $ne: "cancelled" },
    }).select("doctorFeeAmount");

    const totalEarned = operations.reduce(
      (total, item) => total + Number(item.doctorFeeAmount || 0),
      0
    );

    const settlements = await doctorSettlementModels.aggregate([
      {
        $match: {
          doctor: doctorExists._id,
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" },
        },
      },
    ]);

    const totalPaid = settlements.length
      ? Number(settlements[0].totalPaid || 0)
      : 0;

    const doctorDue = Math.max(totalEarned - totalPaid, 0);

    if (roundedAmount > doctorDue) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.exceedsDoctorDue"),
        totalEarned,
        totalPaid,
        due: doctorDue,
      });
    }

    if (operationExists) {
      const operationSettlements = await doctorSettlementModels.aggregate([
        {
          $match: {
            operation: operationExists._id,
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: "$amount" },
          },
        },
      ]);

      const operationPaid = operationSettlements.length
        ? Number(operationSettlements[0].totalPaid || 0)
        : 0;

      const operationDue = Math.max(
        Number(operationExists.doctorFeeAmount || 0) - operationPaid,
        0
      );

      if (roundedAmount > operationDue) {
        return res.status(400).json({
          success: false,
          message: req.t("doctorSettlements.exceedsOperationDue"),
          doctorFeeAmount: Number(operationExists.doctorFeeAmount || 0),
          paid: operationPaid,
          due: operationDue,
        });
      }
    }

    const cashDrawer = await cashDrawerModels.findOne({
      status: "open",
    }).select("_id openingBalance expectedCash status");

    if (!cashDrawer) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.noOpenCashDrawer"),
      });
    }

    const expectedCash = Number(cashDrawer.expectedCash || 0);

    if (roundedAmount > expectedCash) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.insufficientCash"),
        expectedCash,
        amount: roundedAmount,
      });
    }

    let settlement;

    await session.withTransaction(async () => {
      const created = await doctorSettlementModels.create(
        [
          {
            doctor: doctorExists._id,
            operation: operation || null,
            patient: operationExists?.patient || null,
            amount: roundedAmount,
            paidBy: req.user._id,
            cashDrawer: cashDrawer._id,
            status: "completed",
            notes: notes.trim(),
          },
        ],
        { session }
      );

      settlement = created[0];

      await cashTransactionModels.create(
        [
          {
            cashDrawer: cashDrawer._id,
            type: "expense",
            source: "doctor_settlement",
            amount: roundedAmount,
            operation: operation || null,
            doctor: doctorExists._id,
            patient: operationExists?.patient || null,
            createdBy: req.user._id,
            notes: notes.trim(),
          },
        ],
        { session }
      );

      await cashDrawerModels.updateOne(
        { _id: cashDrawer._id, status: "open" },
        {
          $set: {
            expectedCash: Math.max(expectedCash - roundedAmount, 0),
          },
        },
        { session }
      );
    });

    const populatedSettlement = await doctorSettlementModels
      .findById(settlement._id)
      .populate("doctor", "name phone email")
      .populate("operation", "operationName totalAmount doctorFeeAmount")
      .populate("patient", "name phone")
      .populate("paidBy", "name email")
      .populate("cashDrawer", "openingBalance expectedCash status");

    const newTotalPaid = totalPaid + roundedAmount;

    return res.status(201).json({
      success: true,
      message: req.t("doctorSettlements.createdSuccessfully"),
      settlement: populatedSettlement,
      financialSummary: {
        totalEarned,
        totalPaid: newTotalPaid,
        due: Math.max(totalEarned - newTotalPaid, 0),
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("CREATE DOCTOR SETTLEMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: req.t("doctorSettlements.createFailed"),
    });
  } finally {
    await session.endSession();
  }
};

const getOperationSettlements = async (req, res) => {
  try {
    const { operationId } = req.params;

    if (!isValidId(operationId)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.invalidOperationId"),
      });
    }

    const pagination = getPagination(req.query);

    if (pagination.error) {
      return res.status(400).json({
        success: false,
        message: req.t(`doctorSettlements.${pagination.error}`),
      });
    }

    const { page, limit, skip } = pagination;

    const [settlements, count] = await Promise.all([
      doctorSettlementModels
        .find({ operation: operationId })
        .populate("doctor", "name")
        .populate("patient", "name phone")
        .populate("paidBy", "name")
        .populate("cashDrawer", "openingBalance expectedCash status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      doctorSettlementModels.countDocuments({ operation: operationId }),
    ]);

    const totalPaid = settlements
      .filter((item) => item.status === "completed")
      .reduce((total, item) => total + Number(item.amount || 0), 0);

    return res.status(200).json({
      success: true,
      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalPaid,
      data: settlements,
    });
  } catch (error) {
    console.error("GET OPERATION SETTLEMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: req.t("doctorSettlements.fetchFailed"),
    });
  }
};

const getDoctorSettlements = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!isValidId(doctorId)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.invalidDoctorId"),
      });
    }

    const doctor = await doctorModel.findById(doctorId).select("_id name");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: req.t("doctorSettlements.doctorNotFound"),
      });
    }

    const pagination = getPagination(req.query);

    if (pagination.error) {
      return res.status(400).json({
        success: false,
        message: req.t(`doctorSettlements.${pagination.error}`),
      });
    }

    const { page, limit, skip } = pagination;

    const filter = { doctor: doctorId };

    const [settlements, count] = await Promise.all([
      doctorSettlementModels
        .find(filter)
        .populate("operation", "operationName totalAmount doctorFeeAmount operationDate")
        .populate("patient", "name phone")
        .populate("paidBy", "name")
        .populate("cashDrawer", "openingBalance expectedCash status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      doctorSettlementModels.countDocuments(filter),
    ]);

    const totalPaid = settlements
      .filter((item) => item.status === "completed")
      .reduce((total, item) => total + Number(item.amount || 0), 0);

    return res.status(200).json({
      success: true,
      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalPaid,
      data: settlements,
    });
  } catch (error) {
    console.error("GET DOCTOR SETTLEMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: req.t("doctorSettlements.fetchFailed"),
    });
  }
};

const getSingleDoctorSettlement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.invalidId"),
      });
    }

    const settlement = await doctorSettlementModels
      .findById(id)
      .populate("doctor", "name")
      .populate("operation", "operationName totalAmount doctorFeeAmount operationDate")
      .populate("patient", "name phone")
      .populate("paidBy", "name")
      .populate("cashDrawer", "openingBalance expectedCash status");

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: req.t("doctorSettlements.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    console.error("GET SINGLE DOCTOR SETTLEMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: req.t("doctorSettlements.fetchFailed"),
    });
  }
};

const getDoctorAccount = async (req, res) => {
  try {
    const id = req.params.doctorId;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("doctorSettlements.invalidDoctorId"),
      });
    }

    const doctor = await doctorModel
      .findById(id)
      .populate("specialties", "name");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: req.t("doctorSettlements.doctorNotFound"),
      });
    }

    const operations = await operationModels
      .find({
        doctor: id,
        status: { $ne: "cancelled" },
      })
      .populate("patient", "name phone")
      .populate("specialty", "name")
      .sort({
        operationDate: 1,
        createdAt: 1,
      });

    const settlements = await doctorSettlementModels
      .find({ doctor: id })
      .populate("operation", "operationName operationDate doctorFeeAmount")
      .populate("patient", "name phone")
      .populate("paidBy", "name email")
      .populate("cashDrawer", "openingBalance expectedCash status")
      .sort({
        createdAt: 1,
      });

    const completedSettlements = settlements.filter(
      (settlement) => settlement.status === "completed"
    );

    const totalEarned = operations.reduce(
      (total, operation) => total + Number(operation.doctorFeeAmount || 0),
      0
    );

    const totalPaid = completedSettlements.reduce(
      (total, settlement) => total + Number(settlement.amount || 0),
      0
    );

    const due = Math.max(totalEarned - totalPaid, 0);

    const linkedPayments = new Map();

    completedSettlements.forEach((settlement) => {
      if (!settlement.operation) return;

      const operationId = settlement.operation._id.toString();
      const current = linkedPayments.get(operationId) || 0;

      linkedPayments.set(
        operationId,
        current + Number(settlement.amount || 0)
      );
    });

    let generalSettlementAmount = completedSettlements
      .filter((settlement) => !settlement.operation)
      .reduce(
        (total, settlement) => total + Number(settlement.amount || 0),
        0
      );

    const operationAccount = operations.map((operation) => {
      const operationId = operation._id.toString();

      const doctorFeeAmount = Number(
        operation.doctorFeeAmount || 0
      );

      const directlyPaid = linkedPayments.get(operationId) || 0;

      const directRemaining = Math.max(
        doctorFeeAmount - directlyPaid,
        0
      );

      const allocatedGeneralPayment = Math.min(
        generalSettlementAmount,
        directRemaining
      );

      generalSettlementAmount -= allocatedGeneralPayment;

      const operationDoctorPaid =
        directlyPaid + allocatedGeneralPayment;

      const operationDoctorDue = Math.max(
        doctorFeeAmount - operationDoctorPaid,
        0
      );

      const doctorPaymentStatus =
        operationDoctorDue === 0
          ? "paid"
          : operationDoctorPaid > 0
          ? "partial"
          : "unpaid";

      return {
        operation,
        patientPayment: {
          paidAmount: Number(operation.paidAmount || 0),
          remainingAmount: Number(operation.remainingAmount || 0),
          paymentStatus: operation.paymentStatus || "unpaid",
        },
        doctorPayment: {
          feeAmount: doctorFeeAmount,
          paidAmount: operationDoctorPaid,
          remainingAmount: operationDoctorDue,
          paymentStatus: doctorPaymentStatus,
        },
        doctorFeeAmount,
        paidAmount: operationDoctorPaid,
        remainingAmount: operationDoctorDue,
        paymentStatus: doctorPaymentStatus,
      };
    });

    return res.status(200).json({
      success: true,
      doctor,
      summary: {
        totalEarned,
        totalPaid,
        due,
      },
      account: {
        earned: totalEarned,
        paid: totalPaid,
        due,
      },
      operations: operationAccount,
      settlements,
    });
  } catch (error) {
    console.error("GET DOCTOR ACCOUNT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: req.t("doctorSettlements.fetchFailed"),
    });
  }
};

module.exports = {
  createDoctorSettlement,
  getDoctorAccount,
  getOperationSettlements,
  getDoctorSettlements,
  getSingleDoctorSettlement,
};