const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const cashTransactionSchema = new mongoose.Schema(
  {
    cashDrawer: {
      type: ObjectId,
      ref: "CashDrawer",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    source: {
      type: String,
      enum: [
        "operation_payment",
        "doctor_settlement",
        "sale_payment",
        "visit_payment",
        "expense",
        "refund",
        "other",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    operation: {
      type: ObjectId,
      ref: "Operation",
      default: null,
      index: true,
    },
    visit: {
      type: ObjectId,
      ref: "Visit",
      default: null,
      index: true,
    },
    doctor: {
      type: ObjectId,
      ref: "Doctor",
      default: null,
      index: true,
    },
    sale: {
      type: ObjectId,
      ref: "Sale",
      default: null,
      index: true,
    },
    payment: {
      type: ObjectId,
      ref: "Payment",
      default: null,
      index: true,
    },
    patient: {
      type: ObjectId,
      ref: "Patient",
      default: null,
      index: true,
    },
    createdBy: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

cashTransactionSchema.index({
  cashDrawer: 1,
  createdAt: -1,
});

cashTransactionSchema.index({
  source: 1,
  createdAt: -1,
});

cashTransactionSchema.index({
  type: 1,
  createdAt: -1,
});

cashTransactionSchema.index({
  cashDrawer: 1,
  type: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "CashTransaction",
  cashTransactionSchema
);