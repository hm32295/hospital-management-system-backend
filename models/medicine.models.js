const mongoose = require("mongoose");
const {ObjectId} =mongoose.Schema.Types
const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true},
    genericName: { type: String, trim: true, default: ""},
    category: { type:ObjectId , ref: "MedicineCategory", required: true},
    manufacturer: { type: String, trim: true, default: ""},
    description: { type: String, trim: true, default: ""},
    isActive: { type: Boolean, default: true},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Medicine", medicineSchema);