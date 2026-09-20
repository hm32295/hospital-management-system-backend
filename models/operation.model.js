
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const operationSchema = new mongoose.Schema(
  {
    patient: { type: ObjectId, ref: "Patient", required: true, index: true },
    doctor: { type: ObjectId, ref: "Doctor", required: true, index: true },
    specialty: { type: ObjectId, ref: "Specialty", required: true, index: true },
    operationName: { type: String, required: true, trim: true, maxlength: 200, index: true },
    operationDate: { type: Date, required: true, default: Date.now, index: true },
    cost: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    doctorFeeType: { type: String, enum: ["none", "fixed", "percentage"], default: "none" },
    doctorFeeValue: { type: Number, default: 0, min: 0 },
    doctorFeeAmount: { type: Number, default: 0, min: 0 },
    hospitalAmount: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid", index: true },
    status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending", index: true },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

operationSchema.index({ patient: 1, operationDate: -1 });
operationSchema.index({ doctor: 1, operationDate: -1 });
operationSchema.index({ status: 1, operationDate: -1 });
operationSchema.index({ paymentStatus: 1, operationDate: -1 });

module.exports = mongoose.model("Operation", operationSchema);
