const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const doctorSettlementSchema = new mongoose.Schema(
  {
    doctor: {
      type: ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    operation: {
      type: ObjectId,
      ref: "Operation",
      required: true,
      index: true,
    },

    patient: {
      type: ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    paidBy: {
      type: ObjectId,
      ref: "User",
      required: true,
    },

    cashDrawer: {
      type: ObjectId,
      ref: "CashDrawer",
      required: true,
    },

    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

doctorSettlementSchema.index({
  doctor: 1,
  createdAt: -1,
});

doctorSettlementSchema.index({
  operation: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "DoctorSettlement",
  doctorSettlementSchema
);