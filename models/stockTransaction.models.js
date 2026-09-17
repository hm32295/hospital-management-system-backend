const mongoose = require("mongoose");
const {ObjectId} = mongoose.Schema.Types
const stockTransactionSchema = new mongoose.Schema(
  {
    medicine: { type: ObjectId, ref: "Medicine", required: true },

    batch: { type: ObjectId, ref: "MedicineBatch", required: true },

    type: { type: String, enum: ["IN", "OUT"], required: true },

    quantity: { type: Number, required: true, min: 1 },

    reason: { type: String, trim: true, required: true },

    user: { type: ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "StockTransaction",
  stockTransactionSchema
);