const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const cashDrawerSchema = new mongoose.Schema(
  {
    openedBy: {type: ObjectId,ref: "User",required: true},
    closedBy: {type: ObjectId,ref: "User",default: null},
    openingBalance: {type: Number,required: true,min: 0,default: 0},
    expectedCash: {type: Number,required: true,min: 0,default: 0},
    actualCash: {type: Number,default: 0,min: 0},
    difference: {type: Number,default: 0},
    status: {type: String,enum: ["open", "closed"],default: "open"},
    openedAt: {type: Date,default: Date.now},
    closedAt: {type: Date,default: null},
    notes: {type: String,trim: true,default: ""},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CashDrawer", cashDrawerSchema);