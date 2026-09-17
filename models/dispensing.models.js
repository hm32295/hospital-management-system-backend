
const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const dispensingItemSchema = new mongoose.Schema(
  {
    medicine: { type: ObjectId, ref: "Medicine", required: true},
    batch: { type: ObjectId, ref: "MedicineBatch", required: true},
    quantity: { type: Number, required: true, min: 1},
  },
  {
    _id: false,
  }
);

const dispensingSchema = new mongoose.Schema(
  {
    sale: { type: ObjectId, ref: "Sale", required: true, unique: true, index: true,},
    patient: { type: ObjectId, ref: "Patient", default: null,},
    items: {
      type: [dispensingItemSchema], required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        }, message: "Dispensing must contain at least one medicine",
      },
    },
    reason: { type: String, required: true, trim: true,},
    createdBy: { type: ObjectId, ref: "User", required: true,},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Dispensing", dispensingSchema);