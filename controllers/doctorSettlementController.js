const doctorSettlementModels = require("../models/doctorSettlementModel");
const operationModels = require("../models/operation.model");
const cashDrawerModels = require("../models/cashDrawer.models");
const cashTransactionModels = require("../models/cashTransaction.model");
const doctorModel = require("../models/doctor.model");

const createDoctorSettlement = async (req, res) => {
  try {
    const {doctor,operation,amount,notes = ""} = req.body;

    if (!doctor || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Doctor and amount are required",
      });
    }

    const settlementAmount = Number(amount);

    if (
      !Number.isFinite(settlementAmount) ||
      settlementAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    const doctorExists =
      await doctorModel.findById(doctor);

    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    let operationExists = null;

    if (operation) {
      operationExists =
        await operationModels.findById(operation);

      if (!operationExists) {
        return res.status(404).json({
          success: false,
          message: "Operation not found",
        });
      }

      if (
        operationExists.doctor.toString() !==
        doctor.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This operation does not belong to this doctor",
        });
      }

      if (operationExists.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message:
            "Cancelled operation cannot be settled",
        });
      }

      if (
        Number(operationExists.doctorFeeAmount || 0) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This operation has no doctor fee",
        });
      }
    }

    const operations =
      await operationModels.find({
        doctor: doctorExists._id,
        status: {
          $ne: "cancelled",
        },
      });

    const totalEarned =
      operations.reduce(
        (total, item) =>
          total +
          Number(item.doctorFeeAmount || 0),
        0
      );

    const settlements =
      await doctorSettlementModels.aggregate([
        {
          $match: {
            doctor: doctorExists._id,
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: {
              $sum: "$amount",
            },
          },
        },
      ]);

    const totalPaid =
      settlements.length > 0
        ? Number(settlements[0].totalPaid || 0)
        : 0;

    const doctorDue = Math.max(
      totalEarned - totalPaid,
      0
    );

    if (settlementAmount > doctorDue) {
      return res.status(400).json({
        success: false,
        message:
          "Settlement amount exceeds doctor due",
        totalEarned,
        totalPaid,
        due: doctorDue,
      });
    }

    if (operationExists) {
      const operationSettlements =
        await doctorSettlementModels.aggregate([
          {
            $match: {
              operation: operationExists._id,
              status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              totalPaid: {
                $sum: "$amount",
              },
            },
          },
        ]);

      const operationPaid =
        operationSettlements.length > 0
          ? Number(
              operationSettlements[0].totalPaid || 0
            )
          : 0;

      const operationDue = Math.max(
        Number(
          operationExists.doctorFeeAmount || 0
        ) - operationPaid,
        0
      );

      if (settlementAmount > operationDue) {
        return res.status(400).json({
          success: false,
          message:
            "Settlement amount exceeds operation doctor fee",
          doctorFeeAmount:
            operationExists.doctorFeeAmount,
          paid: operationPaid,
          due: operationDue,
        });
      }
    }

    const cashDrawer =
      await cashDrawerModels.findOne({
        status: "open",
      });

    if (!cashDrawer) {
      return res.status(400).json({
        success: false,
        message: "No open cash drawer",
      });
    }

    const settlement =
      await doctorSettlementModels.create({
        doctor: doctorExists._id,
        operation: operation || null,
        patient:
          operationExists?.patient || null,
        amount: settlementAmount,
        paidBy: req.user._id,
        cashDrawer: cashDrawer._id,
        status: "completed",
        notes,
      });

    await cashTransactionModels.create({
      cashDrawer: cashDrawer._id,
      type: "expense",
      source: "doctor_settlement",
      amount: settlementAmount,
      operation: operation || null,
      doctor: doctorExists._id,
      patient:
        operationExists?.patient || null,
      createdBy: req.user._id,
      notes,
    });

    cashDrawer.expectedCash =
      Math.max(
        Number(cashDrawer.expectedCash || 0) -
          settlementAmount,
        0
      );

    await cashDrawer.save();

    const populatedSettlement =
      await doctorSettlementModels
        .findById(settlement._id)
        .populate(
          "doctor",
          "name phone email"
        )
        .populate(
          "operation",
          "operationName totalAmount doctorFeeAmount"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "paidBy",
          "name email"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash status"
        );

    const newTotalPaid =
      totalPaid + settlementAmount;

    return res.status(201).json({
      success: true,
      message:
        "Doctor settlement created successfully",
      settlement: populatedSettlement,
      financialSummary: {
        totalEarned,
        totalPaid: newTotalPaid,
        due: Math.max(
          totalEarned - newTotalPaid,
          0
        ),
      },
    });
  } catch (error) {
    console.error(
      "CREATE DOCTOR SETTLEMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getOperationSettlements = async (
  req,
  res
) => {
  try {
    const { operationId } = req.params;

    const settlements =
      await doctorSettlementModels
        .find({
          operation: operationId,
        })
        .populate("doctor", "name")
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "paidBy",
          "name"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash status"
        )
        .sort({ createdAt: -1 });

    const totalPaid =
      settlements
        .filter(
          (item) =>
            item.status === "completed"
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.amount || 0),
          0
        );

    return res.status(200).json({
      success: true,
      count: settlements.length,
      totalPaid,
      data: settlements,
    });
  } catch (error) {
    console.error(
      "Get operation settlements error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get operation settlements",
      error: error.message,
    });
  }
};

const getDoctorSettlements = async (
  req,
  res
) => {
  try {
    const { doctorId } = req.params;

    const doctor =
      await doctorModel.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const settlements =
      await doctorSettlementModels
        .find({
          doctor: doctorId,
        })
        .populate(
          "operation",
          "operationName totalAmount doctorFeeAmount operationDate"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "paidBy",
          "name"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash status"
        )
        .sort({ createdAt: -1 });

    const totalPaid =
      settlements
        .filter(
          (item) =>
            item.status === "completed"
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.amount || 0),
          0
        );

    return res.status(200).json({
      success: true,
      count: settlements.length,
      totalPaid,
      data: settlements,
    });
  } catch (error) {
    console.error(
      "Get doctor settlements error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get doctor settlements",
      error: error.message,
    });
  }
};

const getSingleDoctorSettlement = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const settlement =
      await doctorSettlementModels
        .findById(id)
        .populate(
          "doctor",
          "name"
        )
        .populate(
          "operation",
          "operationName totalAmount doctorFeeAmount operationDate"
        )
        .populate(
          "patient",
          "name phone"
        )
        .populate(
          "paidBy",
          "name"
        )
        .populate(
          "cashDrawer",
          "openingBalance expectedCash status"
        );

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor settlement not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    console.error(
      "Get single doctor settlement error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get doctor settlement",
      error: error.message,
    });
  }
};


const getDoctorAccount = async (req, res) => {
  try {
    const id = req.params.doctorId;

    const doctor = await doctorModel
      .findById(id)
      .populate("specialties", "name");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const operations = await operationModels
      .find({doctor: id, status: { $ne: "cancelled" }})
      .populate("patient", "name phone")
      .populate("specialty", "name")
      .sort({
        operationDate: 1,
        createdAt: 1,
      });

    const settlements = await doctorSettlementModels
      .find({ doctor: id,})
      .populate( "operation","operationName operationDate doctorFeeAmount" )
      .populate("patient", "name phone")
      .populate("paidBy", "name email")
      .populate( "cashDrawer","openingBalance expectedCash status"
      )
      .sort({
        createdAt: 1,
      });

    const completedSettlements =
      settlements.filter(
        (settlement) =>
          settlement.status === "completed"
      );

    const totalEarned = operations.reduce(
      (total, operation) =>
        total +
        Number(operation.doctorFeeAmount || 0),
      0
    );

    const totalPaid =
      completedSettlements.reduce(
        (total, settlement) =>
          total + Number(settlement.amount || 0),
        0
      );

    const due = Math.max(
      totalEarned - totalPaid,
      0
    );

    /*
      Settlements linked directly to an operation
      are counted against that operation first.
    */
    const linkedPayments = new Map();

    completedSettlements.forEach(
      (settlement) => {
        if (!settlement.operation) return;

        const operationId =
          settlement.operation._id.toString();

        const current =
          linkedPayments.get(operationId) || 0;

        linkedPayments.set(
          operationId,
          current +
            Number(settlement.amount || 0)
        );
      }
    );

    /*
      Centralized settlements have no operation.
      We allocate them across operations in order.
    */
    let generalSettlementAmount =
      completedSettlements
        .filter(
          (settlement) =>
            !settlement.operation
        )
        .reduce(
          (total, settlement) =>
            total +
            Number(settlement.amount || 0),
          0
        );

    const operationAccount =
      operations.map((operation) => {
        const operationId =
          operation._id.toString();

        const doctorFeeAmount = Number(
          operation.doctorFeeAmount || 0
        );

        const directlyPaid =
          linkedPayments.get(operationId) ||
          0;

        const directRemaining = Math.max(
          doctorFeeAmount - directlyPaid,
          0
        );

        const allocatedGeneralPayment =
          Math.min(
            generalSettlementAmount,
            directRemaining
          );

        generalSettlementAmount -=
          allocatedGeneralPayment;

        const operationDoctorPaid =
          directlyPaid +
          allocatedGeneralPayment;

        const operationDoctorDue =
          Math.max(
            doctorFeeAmount -
              operationDoctorPaid,
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

          // Patient payment for the operation
          patientPayment: {
            paidAmount: Number(
              operation.paidAmount || 0
            ),
            remainingAmount: Number(
              operation.remainingAmount || 0
            ),
            paymentStatus:
              operation.paymentStatus ||
              "unpaid",
          },

          // Doctor payment for this operation
          doctorPayment: {
            feeAmount: doctorFeeAmount,
            paidAmount: operationDoctorPaid,
            remainingAmount:
              operationDoctorDue,
            paymentStatus:
              doctorPaymentStatus,
          },

          // Keep old fields for frontend compatibility
          doctorFeeAmount,

          paidAmount:
            operationDoctorPaid,

          remainingAmount:
            operationDoctorDue,

          paymentStatus:
            doctorPaymentStatus,
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
    console.error(
      "GET DOCTOR ACCOUNT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
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