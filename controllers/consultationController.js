
const mongoose = require("mongoose");
const Consultation = require("../models/consultation.model");
const Visit = require("../models/visit.model");
const Prescription = require("../models/prescription.models");
const Medicine = require("../models/medicine.models");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  return value.trim() || null;
};

const consultationPopulate = (query) =>
  query
    .populate("visit", "patient specialty doctor visitType consultationFee paymentStatus status completedAt")
    .populate("patient", "name phone email nationalId dateOfBirth gender address")
    .populate("doctor", "name phone email");

const validateConsultationText = (value) => {
  if (value === undefined) return true;
  return typeof value === "string";
};

const validatePrescriptionItems = (items, req) => {
  if (!Array.isArray(items)) {
    return req.t("consultations.itemsMustBeArray");
  }

  for (const item of items) {
    if (!item || !item.medicine || item.quantity === undefined || !item.dosage || !item.frequency || !item.duration) {
      return req.t("consultations.invalidPrescriptionItem");
    }

    if (!isValidId(item.medicine)) {
      return req.t("consultations.invalidMedicineId");
    }

    const quantity = Number(item.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      return req.t("consultations.invalidMedicineQuantity");
    }

    if (
      typeof item.dosage !== "string" ||
      typeof item.frequency !== "string" ||
      typeof item.duration !== "string"
    ) {
      return req.t("consultations.invalidPrescriptionItem");
    }

    if (item.instructions !== undefined && typeof item.instructions !== "string") {
      return req.t("consultations.invalidPrescriptionInstructions");
    }

    if (!item.dosage.trim() || !item.frequency.trim() || !item.duration.trim()) {
      return req.t("consultations.invalidPrescriptionItem");
    }
  }

  return null;
};

const createConsultation = async (req, res) => {
  try {
    const { visit, symptoms, diagnosis, notes } = req.body;

    if (!visit) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.visitRequired"),
      });
    }

    if (!isValidId(visit)) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.invalidVisitId"),
      });
    }

    if (!validateConsultationText(symptoms) || !validateConsultationText(diagnosis) || !validateConsultationText(notes)) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.textFieldsMustBeString"),
      });
    }

    const existingVisit = await Visit.findById(visit);

    if (!existingVisit) {
      return res.status(404).json({
        success: false,
        message: req.t("consultations.visitNotFound"),
      });
    }

    if (existingVisit.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.cancelledVisit"),
      });
    }

    if (existingVisit.status !== "in_consultation") {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.visitMustBeInConsultation"),
      });
    }

    if (!existingVisit.doctor) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.visitDoctorRequired"),
      });
    }

    const existingConsultation = await Consultation.findOne({ visit });

    if (existingConsultation) {
      return res.status(409).json({
        success: false,
        message: req.t("consultations.alreadyExists"),
        consultation: existingConsultation,
      });
    }

    const consultation = await Consultation.create({
      visit: existingVisit._id,
      patient: existingVisit.patient,
      doctor: existingVisit.doctor,
      symptoms: normalizeText(symptoms),
      diagnosis: normalizeText(diagnosis),
      notes: normalizeText(notes),
    });

    const createdConsultation = await consultationPopulate(
      Consultation.findById(consultation._id)
    );

    return res.status(201).json({
      success: true,
      message: req.t("consultations.createdSuccessfully"),
      consultation: createdConsultation,
    });
  } catch (error) {
    console.error("CREATE CONSULTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: req.t("consultations.createFailed"),
    });
  }
};

const getConsultationByVisit = async (req, res) => {
  try {
    const { visitId } = req.params;

    if (!isValidId(visitId)) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.invalidVisitId"),
      });
    }

    const consultation = await consultationPopulate(
      Consultation.findOne({ visit: visitId })
    );

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: req.t("consultations.notFound"),
      });
    }

    return res.status(200).json({
      success: true,
      consultation,
    });
  } catch (error) {
    console.error("GET CONSULTATION BY VISIT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: req.t("consultations.fetchFailed"),
    });
  }
};

const updateConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { symptoms, diagnosis, notes } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.invalidId"),
      });
    }

    if (!validateConsultationText(symptoms) || !validateConsultationText(diagnosis) || !validateConsultationText(notes)) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.textFieldsMustBeString"),
      });
    }

    const consultation = await Consultation.findById(id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: req.t("consultations.notFound"),
      });
    }

    const visit = await Visit.findById(consultation.visit);

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: req.t("consultations.visitNotFound"),
      });
    }

    if (visit.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.cancelledVisitCannotUpdate"),
      });
    }

    if (visit.status === "completed") {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.completedCannotUpdate"),
      });
    }

    if (symptoms !== undefined) {
      consultation.symptoms = normalizeText(symptoms);
    }

    if (diagnosis !== undefined) {
      consultation.diagnosis = normalizeText(diagnosis);
    }

    if (notes !== undefined) {
      consultation.notes = normalizeText(notes);
    }

    await consultation.save();

    const updatedConsultation = await consultationPopulate(
      Consultation.findById(consultation._id)
    );

    return res.status(200).json({
      success: true,
      message: req.t("consultations.updatedSuccessfully"),
      consultation: updatedConsultation,
    });
  } catch (error) {
    console.error("UPDATE CONSULTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: req.t("consultations.updateFailed"),
    });
  }
};

const completeConsultation = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      visit: visitId,
      symptoms,
      diagnosis,
      notes,
      items = [],
      prescriptionNotes,
    } = req.body;

    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.visitRequired"),
      });
    }

    if (!isValidId(visitId)) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.invalidVisitId"),
      });
    }

    if (
      !validateConsultationText(symptoms) ||
      !validateConsultationText(diagnosis) ||
      !validateConsultationText(notes) ||
      !validateConsultationText(prescriptionNotes)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("consultations.textFieldsMustBeString"),
      });
    }

    const itemsError = validatePrescriptionItems(items, req);

    if (itemsError) {
      return res.status(400).json({
        success: false,
        message: itemsError,
      });
    }

    await session.withTransaction(async () => {
      const visit = await Visit.findById(visitId).session(session);

      if (!visit) {
        throw new Error("VISIT_NOT_FOUND");
      }

      if (visit.status === "cancelled") {
        throw new Error("CANCELLED_VISIT");
      }

      if (visit.status === "completed") {
        throw new Error("VISIT_ALREADY_COMPLETED");
      }

      if (visit.status !== "in_consultation") {
        throw new Error("VISIT_NOT_IN_CONSULTATION");
      }

      if (!visit.doctor) {
        throw new Error("VISIT_DOCTOR_REQUIRED");
      }

      let consultation = await Consultation.findOne({
        visit: visit._id,
      }).session(session);

      if (!consultation) {
        consultation = new Consultation({
          visit: visit._id,
          patient: visit.patient,
          doctor: visit.doctor,
        });
      } else {
        if (consultation.patient?.toString() !== visit.patient?.toString()) {
          throw new Error("CONSULTATION_PATIENT_MISMATCH");
        }

        if (consultation.doctor?.toString() !== visit.doctor?.toString()) {
          throw new Error("CONSULTATION_DOCTOR_MISMATCH");
        }
      }

      consultation.symptoms = normalizeText(symptoms);
      consultation.diagnosis = normalizeText(diagnosis);
      consultation.notes = normalizeText(notes);

      await consultation.save({ session });

      let prescription = null;

      if (items.length > 0) {
        const medicineIds = items.map((item) => item.medicine);

        const medicines = await Medicine.find({
          _id: { $in: medicineIds },
        })
          .select("_id")
          .session(session);

        const medicineIdsSet = new Set(
          medicines.map((medicine) => medicine._id.toString())
        );

        for (const medicineId of medicineIds) {
          if (!medicineIdsSet.has(medicineId.toString())) {
            throw new Error("MEDICINE_NOT_FOUND");
          }
        }

        prescription = await Prescription.findOne({
          consultation: consultation._id,
        }).session(session);

        if (prescription) {
          if (prescription.status === "Cancelled") {
            throw new Error("CANCELLED_PRESCRIPTION");
          }

          if (prescription.status === "Dispensed") {
            throw new Error("DISPENSED_PRESCRIPTION");
          }

          prescription.items = items.map((item) => ({
            medicine: item.medicine,
            quantity: Number(item.quantity),
            dosage: item.dosage.trim(),
            frequency: item.frequency.trim(),
            duration: item.duration.trim(),
            instructions: item.instructions?.trim() || null,
          }));

          prescription.notes = normalizeText(prescriptionNotes);

          await prescription.save({ session });
        } else {
          prescription = new Prescription({
            consultation: consultation._id,
            patient: visit.patient,
            items: items.map((item) => ({
              medicine: item.medicine,
              quantity: Number(item.quantity),
              dosage: item.dosage.trim(),
              frequency: item.frequency.trim(),
              duration: item.duration.trim(),
              instructions: item.instructions?.trim() || null,
            })),
            notes: normalizeText(prescriptionNotes),
            status: "Pending",
            createdBy: req.user._id,
          });

          await prescription.save({ session });
        }
      }

      visit.status = "completed";
      visit.completedAt = new Date();

      await visit.save({ session });

      return { consultation, prescription, visit };
    });

    const consultation = await Consultation.findOne({ visit: visitId });

    const completedConsultation = await consultationPopulate(
      Consultation.findById(consultation._id)
    );

    let populatedPrescription = null;

    if (consultation) {
      const prescription = await Prescription.findOne({
        consultation: consultation._id,
      });

      if (prescription) {
        populatedPrescription = await Prescription.findById(prescription._id)
          .populate(
            "patient",
            "name phone email nationalId dateOfBirth gender address"
          )
          .populate("createdBy", "name email role")
          .populate(
            "consultation",
            "visit patient doctor symptoms diagnosis notes createdAt updatedAt"
          )
          .populate(
            "items.medicine",
            "name genericName manufacturer"
          );
      }
    }

    const completedVisit = await Visit.findById(visitId).select(
      "_id status paymentStatus completedAt"
    );

    return res.status(200).json({
      success: true,
      message: populatedPrescription
        ? req.t("consultations.completedWithPrescription")
        : req.t("consultations.completedSuccessfully"),
      visit: completedVisit,
      consultation: completedConsultation,
      prescription: populatedPrescription,
    });
  } catch (error) {
    console.error("COMPLETE CONSULTATION ERROR:", error);

    const errorMessages = {
      VISIT_NOT_FOUND: "consultations.visitNotFound",
      CANCELLED_VISIT: "consultations.cancelledVisit",
      VISIT_ALREADY_COMPLETED: "consultations.visitAlreadyCompleted",
      VISIT_NOT_IN_CONSULTATION: "consultations.visitMustBeInConsultation",
      VISIT_DOCTOR_REQUIRED: "consultations.visitDoctorRequired",
      CONSULTATION_PATIENT_MISMATCH: "consultations.patientMismatch",
      CONSULTATION_DOCTOR_MISMATCH: "consultations.doctorMismatch",
      MEDICINE_NOT_FOUND: "consultations.medicineNotFound",
      CANCELLED_PRESCRIPTION: "consultations.cancelledPrescription",
      DISPENSED_PRESCRIPTION: "consultations.dispensedPrescription",
    };

    return res.status(400).json({
      success: false,
      message: req.t(errorMessages[error.message] || "consultations.completeFailed"),
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createConsultation,
  getConsultationByVisit,
  updateConsultation,
  completeConsultation,
};

