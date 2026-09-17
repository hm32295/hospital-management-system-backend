const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const visitSchema = new mongoose.Schema(
  {
    patient: { type: ObjectId, ref: "Patient", required: true,},
    specialty: { type: ObjectId, ref: "Specialty", required: true,},
    doctor: { type: ObjectId, ref: "Doctor", default: null,},
    visitType: { type: String, enum: ["first", "follow_up"], required: true,},
    consultationFee: { type: Number, required: true, min: 0,},
    paymentStatus: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending",},
    status: { type: String, enum: [   "waiting",   "in_consultation",   "completed",   "cancelled", ], default: "waiting",},
    completedAt: { type: Date, default: null,},
    notes: { type: String, trim: true, default: null,},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Visit", visitSchema);