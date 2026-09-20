const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const visitSchema = new mongoose.Schema({
  patient: { type: ObjectId, ref: "Patient", required: true, index: true },
  specialty: { type: ObjectId, ref: "Specialty", required: true, index: true },
  doctor: { type: ObjectId, ref: "Doctor", default: null, index: true },
  visitType: { type: String, enum: ["first", "follow_up"], required: true },
  consultationFee: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending", index: true },
  status: { type: String, enum: ["waiting", "in_consultation", "completed", "cancelled"], default: "waiting", index: true },
  completedAt: { type: Date, default: null },
  notes: { type: String, trim: true, default: null },
}, {
  timestamps: true,
});

visitSchema.index({ patient: 1, specialty: 1, status: 1 });
visitSchema.index({ doctor: 1, status: 1 });
visitSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Visit", visitSchema);