const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicine: {
      type: ObjectId,
      ref: "Medicine",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    dispensedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const prescriptionSchema = new mongoose.Schema(
  {
    consultation: {
      type: ObjectId,
      ref: "Consultation",
      required: true,
      unique: true,
      index: true,
    },
    patient: {
      type: ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    items: {
      type: [prescriptionItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message:
          "Prescription must contain at least one medicine",
      },
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Partially Dispensed",
        "Dispensed",
        "Cancelled",
      ],
      default: "Pending",
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Prescription",
  prescriptionSchema
);