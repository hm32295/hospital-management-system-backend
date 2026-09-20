const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    specialties: [
      {
        type: ObjectId,
        ref: "Specialty",
        required: true,
      },
    ],
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

doctorSchema.index({ name: 1, isActive: 1 });
doctorSchema.index({ specialties: 1, isActive: 1 });

module.exports = mongoose.model("Doctor", doctorSchema);