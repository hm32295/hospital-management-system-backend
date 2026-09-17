const mongoose = require("mongoose");

const Consultation = require("../models/consultation.model");
const Visit = require("../models/visit.model");
const Prescription = require("../models/prescription.models");

const Medicine = require("../models/medicine.models");

const createConsultation = async (req, res) => {

  try {
    const {visit,symptoms,diagnosis, notes,} = req.body;

    if (!visit) {
      return res.status(400).json({
        success: false,
        message: "Visit is required",
      });
    }

    const existingVisit =
      await Visit.findById(visit);

    if (!existingVisit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    if (existingVisit.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot create consultation for a cancelled visit",
      });
    }

    if (existingVisit.status !== "in_consultation") {
      return res.status(400).json({
        success: false,
        message:
          "Visit must be in consultation status",
      });
    }

    if (!existingVisit.doctor) {
      return res.status(400).json({
        success: false,
        message:
          "Visit must have an assigned doctor",
      });
    }

    const existingConsultation =
      await Consultation.findOne({ visit });

    if (existingConsultation) {
      return res.status(409).json({
        success: false,
        message:
          "Consultation already exists for this visit",
        consultation: existingConsultation,
      });
    }

    const consultation =
      await Consultation.create({
        visit: existingVisit._id,
        patient: existingVisit.patient,
        doctor: existingVisit.doctor,
        symptoms: symptoms?.trim() || null,
        diagnosis: diagnosis?.trim() || null,
        notes: notes?.trim() || null,
      });

    const createdConsultation =
      await Consultation.findById(
        consultation._id
      )
        .populate(
          "visit",
          "patient specialty doctor visitType consultationFee paymentStatus status"
        )
        .populate(
          "patient",
          "name phone email nationalId dateOfBirth gender address"
        )
        .populate(
          "doctor",
          "name phone email"
        );

    return res.status(201).json({
      success: true,
      message:
        "Consultation created successfully",
      consultation: createdConsultation,
    });
  } catch (error) {
    console.error(
      "Create consultation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getConsultationByVisit = async (
  req,
  res
) => {
  try {
    const { visitId } = req.params;

    const consultation =
      await Consultation.findOne({
        visit: visitId,
      })
        .populate(
          "visit",
          "patient specialty doctor visitType consultationFee paymentStatus status"
        )
        .populate(
          "patient",
          "name phone email nationalId dateOfBirth gender address"
        )
        .populate(
          "doctor",
          "name phone email"
        );

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    return res.status(200).json({
      success: true,
      consultation,
    });
  } catch (error) {
    console.error(
      "Get consultation by visit error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateConsultation = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      symptoms,
      diagnosis,
      notes,
    } = req.body;

    const consultation =
      await Consultation.findById(id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    const visit =
      await Visit.findById(
        consultation.visit
      );

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    if (visit.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled visit cannot be updated",
      });
    }

    if (visit.status === "completed") {
      return res.status(400).json({
        success: false,
        message:
          "Completed consultation cannot be updated",
      });
    }

    if (symptoms !== undefined) {
      consultation.symptoms =
        symptoms?.trim() || null;
    }

    if (diagnosis !== undefined) {
      consultation.diagnosis =
        diagnosis?.trim() || null;
    }

    if (notes !== undefined) {
      consultation.notes =
        notes?.trim() || null;
    }

    await consultation.save();

    const updatedConsultation =
      await Consultation.findById(
        consultation._id
      )
        .populate(
          "visit",
          "patient specialty doctor visitType consultationFee paymentStatus status"
        )
        .populate(
          "patient",
          "name phone email nationalId dateOfBirth gender address"
        )
        .populate(
          "doctor",
          "name phone email"
        );

    return res.status(200).json({
      success: true,
      message:
        "Consultation updated successfully",
      consultation:
        updatedConsultation,
    });
  } catch (error) {
    console.error(
      "Update consultation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const completeConsultation = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      visit: visitId,
      symptoms,
      diagnosis,
      notes,
      items = [],
      prescriptionNotes,
    } = req.body;

    if (!visitId) {
      throw new Error(
        "Visit is required"
      );
    }

    if (!Array.isArray(items)) {
      throw new Error(
        "Prescription items must be an array"
      );
    }

    const visit =
      await Visit.findById(
        visitId
      ).session(session);

    if (!visit) {
      throw new Error(
        "Visit not found"
      );
    }

    if (visit.status === "cancelled") {
      throw new Error(
        "Cancelled visit cannot be completed"
      );
    }

    if (visit.status === "completed") {
      throw new Error(
        "Visit is already completed"
      );
    }

    if (
      visit.status !==
      "in_consultation"
    ) {
      throw new Error(
        "Visit must be in consultation status"
      );
    }

    if (!visit.doctor) {
      throw new Error(
        "Visit must have an assigned doctor"
      );
    }

    let consultation =
      await Consultation.findOne({
        visit: visit._id,
      }).session(session);

    if (!consultation) {
      consultation =
        new Consultation({
          visit: visit._id,
          patient: visit.patient,
          doctor: visit.doctor,
        });
    } else {
      if (
        consultation.patient?.toString() !==
        visit.patient?.toString()
      ) {
        throw new Error(
          "Consultation patient does not match visit patient"
        );
      }

      if (
        consultation.doctor?.toString() !==
        visit.doctor?.toString()
      ) {
        throw new Error(
          "Consultation doctor does not match visit doctor"
        );
      }
    }

    consultation.symptoms =
      symptoms?.trim() || null;

    consultation.diagnosis =
      diagnosis?.trim() || null;

    consultation.notes =
      notes?.trim() || null;

    await consultation.save({
      session,
    });

    let prescription = null;

    if (items.length > 0) {
      for (const item of items) {
        if (
          !item.medicine ||
          !item.quantity ||
          !item.dosage ||
          !item.frequency ||
          !item.duration
        ) {
          throw new Error(
            "Each prescription item must contain medicine, quantity, dosage, frequency and duration"
          );
        }

        if (
          Number(item.quantity) <= 0
        ) {
          throw new Error(
            "Medicine quantity must be greater than zero"
          );
        }

        const medicine =
          await Medicine.findById(
            item.medicine
          ).session(session);

        if (!medicine) {
          throw new Error(
            `Medicine not found: ${item.medicine}`
          );
        }
      }

      prescription =
        await Prescription.findOne({
          consultation:
            consultation._id,
        }).session(session);

      if (prescription) {
        if (
          prescription.status ===
          "Cancelled"
        ) {
          throw new Error(
            "Cancelled prescription cannot be updated"
          );
        }

        if (
          prescription.status ===
          "Dispensed"
        ) {
          throw new Error(
            "Dispensed prescription cannot be updated"
          );
        }

        prescription.items =
          items.map((item) => ({
            medicine: item.medicine,
            quantity: Number(
              item.quantity
            ),
            dosage:
              item.dosage.trim(),
            frequency:
              item.frequency.trim(),
            duration:
              item.duration.trim(),
            instructions:
              item.instructions
                ?.trim() || null,
          }));

        prescription.notes =
          prescriptionNotes?.trim() ||
          null;

        await prescription.save({
          session,
        });
      } else {
        prescription =
          new Prescription({
            consultation:
              consultation._id,
            patient: visit.patient,
            items: items.map(
              (item) => ({
                medicine:
                  item.medicine,
                quantity: Number(
                  item.quantity
                ),
                dosage:
                  item.dosage.trim(),
                frequency:
                  item.frequency.trim(),
                duration:
                  item.duration.trim(),
                instructions:
                  item.instructions
                    ?.trim() || null,
              })
            ),
            notes:
              prescriptionNotes
                ?.trim() || null,
            status: "Pending",
            createdBy:
              req.user._id,
          });

        await prescription.save({
          session,
        });
      }
    }

    visit.status = "completed";
    visit.completedAt =
      new Date();

    await visit.save({
      session,
    });

    await session.commitTransaction();

    const completedConsultation =
      await Consultation.findById(
        consultation._id
      )
        .populate(
          "patient",
          "name phone email nationalId dateOfBirth gender address"
        )
        .populate(
          "doctor",
          "name phone email"
        )
        .populate(
          "visit",
          "patient specialty doctor visitType consultationFee paymentStatus status completedAt"
        );

    let populatedPrescription =
      null;

    if (prescription) {
      populatedPrescription =
        await Prescription.findById(
          prescription._id
        )
          .populate(
            "patient",
            "name phone email nationalId dateOfBirth gender address"
          )
          .populate(
            "createdBy",
            "name email role"
          )
          .populate(
            "consultation",
            "visit patient doctor symptoms diagnosis notes createdAt updatedAt"
          )
          .populate(
            "items.medicine",
            "name genericName manufacturer"
          );
    }

    return res.status(200).json({
      success: true,
      message:
        populatedPrescription
          ? "Consultation and prescription completed successfully"
          : "Consultation completed successfully",
      visit: {
        _id: visit._id,
        status: visit.status,
        paymentStatus:
          visit.paymentStatus,
        completedAt:
          visit.completedAt,
      },
      consultation:
        completedConsultation,
      prescription:
        populatedPrescription,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "Complete consultation error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createConsultation,
  getConsultationByVisit,
  updateConsultation,
  completeConsultation,
};