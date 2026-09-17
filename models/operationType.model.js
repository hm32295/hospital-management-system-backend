const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const operationTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150},
    specialty: { type: ObjectId, ref: "Specialty", required: true},
    description: { type: String, trim: true, default: null},
    defaultCost: { type: Number, required: true, min: 0, default: 0},
    defaultDoctorFeeType: { type: String, enum: ["fixed", "percentage"], default: "percentage"},
    defaultDoctorFeeValue: { type: Number, required: true, min: 0, default: 0},
    isActive: { type: Boolean, default: true},
  },
  {
    timestamps: true,
  }
);

operationTypeSchema.index(
  { name: 1, specialty: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "OperationType",
  operationTypeSchema
);
