
const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const expenseSchema = new mongoose.Schema(
  {
    cashDrawer: {
      type: ObjectId,
      ref: "CashDrawer",
      required: true,
      index: true,
    },

    createdBy: {
      type: ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    category: {
      type: String,
      enum: [
        "supplies",
        "maintenance",
        "transportation",
        "utilities",
        "salary",
        "other",
      ],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash"],
      default: "cash",
      required: true,
    },

    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Expense", expenseSchema);
