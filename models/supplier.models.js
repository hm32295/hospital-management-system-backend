const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    phone: { type: String, required: true, trim: true },

    email: { type: String, trim: true, lowercase: true },

    address: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Supplier", supplierSchema);