const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const operationPaymentSchema = new mongoose.Schema(
  {
    operation: { type: ObjectId, ref: "Operation", required: true, index: true,},
    patient: { type: ObjectId, ref: "Patient", required: true, index: true,},
    amount: { type: Number, required: true, min: 0.01,},
    receivedBy: { type: ObjectId, ref: "User", required: true,},
    cashDrawer: { type: ObjectId, ref: "CashDrawer", required: true,},
    status: { type: String, enum: ["completed", "cancelled"], default: "completed",},
    notes: { type: String, trim: true, default: "",},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "OperationPayment",
  operationPaymentSchema
);