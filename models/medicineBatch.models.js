const mongoose = require("mongoose");
const {ObjectId} = mongoose.Schema.Types
const medicineBatchSchema = new mongoose.Schema(
  {
    medicine: { type: ObjectId, ref: "Medicine", required: true },
    batchNumber: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    barcodeValue: { type: String ,}
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model( "MedicineBatch", medicineBatchSchema);