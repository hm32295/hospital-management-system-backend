const mongoose = require("mongoose");

const { ObjectId } =
  mongoose.Schema.Types;

const purchaseItemSchema =
  new mongoose.Schema(
    {
      medicine: {
        type: ObjectId,
        ref: "Medicine",
        required: true,
      },

      batchNumber: {
        type: String,
        required: true,
        trim: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      expiryDate: {
        type: Date,
        required: true,
      },

      purchasePrice: {
        type: Number,
        required: true,
        min: 0,
      },

      sellingPrice: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      _id: true,
    }
  );

const purchaseSchema =
  new mongoose.Schema(
    {
      supplier: {
        type: ObjectId,
        ref: "Supplier",
        required: true,
      },

      invoiceNumber: {
        type: String,
        required: true,
        trim: true,
        unique: true,
      },

      purchaseDate: {
        type: Date,
        default: Date.now,
      },

      items: {
        type: [purchaseItemSchema],
        required: true,
        validate: {
          validator: function (items) {
            return items.length > 0;
          },
          message:
            "Purchase must contain at least one item",
        },
      },

      totalAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      status: {
        type: String,
        enum: [
          "Pending",
          "Confirmed",
          "Cancelled",
        ],
        default: "Pending",
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

module.exports =
  mongoose.model(
    "Purchase",
    purchaseSchema
  );