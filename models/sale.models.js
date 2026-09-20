const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const saleItemSchema = new mongoose.Schema({
  medicine: { type: ObjectId, ref: "Medicine", required: true },
  batch: { type: ObjectId, ref: "MedicineBatch", required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  prescription: { type: ObjectId, ref: "Prescription", default: null, unique: true, sparse: true },
  patient: { type: ObjectId, ref: "Patient", default: null },
  createdBy: { type: ObjectId, ref: "User", required: true },
  items: {
    type: [saleItemSchema],
    required: true,
    validate: {
      validator: (items) => Array.isArray(items) && items.length > 0,
      message: "Sale must contain at least one medicine",
    },
  },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" },
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  notes: { type: String, trim: true, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Sale", saleSchema);