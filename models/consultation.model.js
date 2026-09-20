
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const consultationSchema = new mongoose.Schema(
  {
    visit: { type: ObjectId, ref: "Visit", required: true, unique: true, index: true },
    patient: { type: ObjectId, ref: "Patient", required: true, index: true },
    doctor: { type: ObjectId, ref: "Doctor", required: true, index: true },
    symptoms: { type: String, trim: true, default: null },
    diagnosis: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

consultationSchema.index({ doctor: 1, createdAt: -1 });
consultationSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model("Consultation", consultationSchema);
