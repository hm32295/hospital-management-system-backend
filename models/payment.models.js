const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const paymentSchema = new mongoose.Schema({
  type: { type: String, enum: ["sale", "visit", "operation"], required: true, index: true },
  sale: { type: ObjectId, ref: "Sale", default: null, index: true },
  visit: { type: ObjectId, ref: "Visit", default: null, index: true },
  operation: { type: ObjectId, ref: "Operation", default: null, index: true },
  patient: { type: ObjectId, ref: "Patient", default: null, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  receivedBy: { type: ObjectId, ref: "User", required: true },
  cashDrawer: { type: ObjectId, ref: "CashDrawer", required: true },
  status: { type: String, enum: ["completed", "cancelled"], default: "completed" },
  notes: { type: String, trim: true, default: "" },
}, { timestamps: true });

paymentSchema.pre("validate", function (next) {
  const references = [this.sale, this.visit, this.operation].filter(Boolean);

  if (references.length !== 1) {
    return next(new Error("Payment must belong to exactly one payment source"));
  }

  if (this.sale) this.type = "sale";
  if (this.visit) this.type = "visit";
  if (this.operation) this.type = "operation";

  next();
});

paymentSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);