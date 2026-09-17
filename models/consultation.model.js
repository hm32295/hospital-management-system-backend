const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const consultationSchema = new mongoose.Schema(
  {
    visit: {
      type: ObjectId,
      ref: "Visit",
      required: true,
      unique: true,
      index: true,
    },
    patient: {
      type: ObjectId,
      ref: "Patient",
      required: true,
    },
    doctor: {
      type: ObjectId,
      ref: "Doctor",
      required: true,
    },
    symptoms: {
      type: String,
      trim: true,
      default: null,
    },
    diagnosis: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Consultation", consultationSchema);