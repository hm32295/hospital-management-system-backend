const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const operationSchema = new mongoose.Schema(
  {
    patient: {type: ObjectId,ref: "Patient",required: true},
    doctor: {type: ObjectId,ref: "Doctor",required: true},
    specialty: {type: ObjectId,ref: "Specialty",required: true},
    operationName: {type: String,required: true,trim: true,maxlength: 200},
    operationDate: {type: Date,required: true,default: Date.now},
    cost: {type: Number,required: true,min: 0},
    discount: {type: Number,default: 0,min: 0},
    totalAmount: {type: Number,required: true,min: 0},
    doctorFeeType: {type: String,enum: ["none", "fixed", "percentage"],default: "none"},
    doctorFeeValue: {type: Number,default: 0,min: 0},
    doctorFeeAmount: {type: Number,default: 0,min: 0},
    hospitalAmount: {type: Number,default: 0,min: 0},
    paidAmount: {type: Number,default: 0,min: 0},
    remainingAmount: {type: Number,default: 0,min: 0},
    paymentStatus: {type: String,enum: ["unpaid", "partial", "paid"],default: "unpaid"},
    status: {type: String,enum: ["pending", "completed", "cancelled"],default: "pending"},
    notes: {type: String,trim: true,default: ""},
    createdBy: {type: ObjectId,ref: "User",required: true},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Operation", operationSchema);