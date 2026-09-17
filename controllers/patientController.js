const patientModels = require("../models/patient.models");
const visitModels = require("../models/visit.model");
const prescriptionModels = require("../models/prescription.models");
const saleModels = require("../models/sale.models");
const paymentModels = require("../models/payment.models");

const getAllPatient = async (req, res) => {
  console.log('test');
  
  try {
    const {search,page = 1,limit = 10} = req.query;
    const filter = {isActive: true};
    if (search?.trim()) {
      const searchValue = search.trim();
      filter.$or = [
        {name: { $regex: searchValue,$options: "i"}},
        {phone: {$regex: searchValue,$options: "i"}},
        {nationalId: {$regex: searchValue,$options: "i"}},
      ];
    }

    const pageNumber = Math.max(Number(page) || 1,1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),100
    );

    const skip =(pageNumber - 1) * limitNumber;
    const total = await patientModels.countDocuments(filter);
    const patients =await patientModels.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      patients,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber ),
      },
    });
  } catch (error) {
    console.error(
      "Get patients error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get patients",
      error: error.message,
    });
  }
};

const getSinglePatient = async (req, res) => {
  try {
    const patient =
      await patientModels.findOne({
        _id: req.params.id,
        isActive: true,
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    return res.status(200).json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error(
      "Get single patient error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get patient",
      error: error.message,
    });
  }
};

const getPatientDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const patient =
      await patientModels.findOne({
        _id: id,
        isActive: true,
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const visits =
      await visitModels
        .find({
          patient: id,
        })
        .populate(
          "specialty",
          "name"
        )
        .populate(
          "doctor",
          "name phone"
        )
        .sort({
          createdAt: -1,
        });

    const prescriptions =
      await prescriptionModels
        .find({
          patient: id,
        })
        .populate(
          "consultation",
          "createdAt"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        )
        .populate(
          "createdBy",
          "name role"
        )
        .sort({
          createdAt: -1,
        });

    const sales =
      await saleModels
        .find({
          patient: id,
        })
        .populate(
          "prescription",
          "status createdAt"
        )
        .populate(
          "createdBy",
          "name role"
        )
        .populate(
          "items.medicine",
          "name genericName manufacturer"
        )
        .populate(
          "items.batch",
          "batchNumber expiryDate"
        )
        .sort({
          createdAt: -1,
        });

    const payments =
      await paymentModels
        .find({
          patient: id,
          status: "completed",
        })
        .populate(
          "sale",
          "totalAmount paymentStatus"
        )
        .populate(
          "visit",
          "consultationFee paymentStatus"
        )
        .populate(
          "receivedBy",
          "name role"
        )
        .sort({
          createdAt: -1,
        });

    const validVisits =
      visits.filter(
        (visit) =>
          visit.status !== "cancelled"
      );

    const validSales =
      sales.filter(
        (sale) =>
          sale.status !== "cancelled"
      );

    const visitTotal =
      validVisits.reduce(
        (total, visit) =>
          total +
          Number(
            visit.consultationFee || 0
          ),
        0
      );

    const visitPaid =
      validVisits
        .filter(
          (visit) =>
            visit.paymentStatus === "paid"
        )
        .reduce(
          (total, visit) =>
            total +
            Number(
              visit.consultationFee || 0
            ),
          0
        );

    const salesTotal =
      validSales.reduce(
        (total, sale) =>
          total +
          Number(
            sale.totalAmount || 0
          ),
        0
      );

    const salesPaid =
      validSales.reduce(
        (total, sale) =>
          total +
          Number(
            sale.paidAmount || 0
          ),
        0
      );

    const totalCharges =
      visitTotal + salesTotal;

    const totalPaid =
      payments.reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount || 0
          ),
        0
      );

    const totalRemaining =
      Math.max(
        totalCharges - totalPaid,
        0
      );

    return res.status(200).json({
      success: true,

      patient,

      summary: {
        visitsCount: visits.length,
        prescriptionsCount:
          prescriptions.length,
        salesCount: sales.length,
        paymentsCount:
          payments.length,

        visitTotal,
        visitPaid,

        salesTotal,
        salesPaid,

        totalCharges,
        totalPaid,
        totalRemaining,
      },

      visits,
      prescriptions,
      sales,
      payments,
    });
  } catch (error) {
    console.error(
      "Get patient details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get patient details",
      error: error.message,
    });
  }
};

const createPatient = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      nationalId,
      dateOfBirth,
      gender,
      address,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Patient name is required",
      });
    }

    const cleanPhone =
      phone?.trim() || null;

    const cleanNationalId =
      nationalId?.trim() || null;

    if (cleanNationalId) {
      const existingPatient =
        await patientModels.findOne({
          nationalId: cleanNationalId,
          isActive: true,
        });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message:
            "A patient with this national ID already exists",
          patient: existingPatient,
        });
      }
    }

    if (cleanPhone) {
      const existingPatient =
        await patientModels.findOne({
          phone: cleanPhone,
          isActive: true,
        });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message:
            "A patient with this phone number already exists",
          patient: existingPatient,
        });
      }
    }

    const patient =
      await patientModels.create({
        name: name.trim(),

        phone: cleanPhone,

        email:
          email?.trim() || null,

        nationalId:
          cleanNationalId,

        dateOfBirth:
          dateOfBirth || null,

        gender:
          gender || null,

        address:
          address?.trim() || null,

        isActive: true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Patient created successfully",
      patient,
    });
  } catch (error) {
    console.error(
      "Create patient error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create patient",
      error: error.message,
    });
  }
};

const updatePatient = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      nationalId,
      dateOfBirth,
      gender,
      address,
      isActive,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Patient name is required",
      });
    }

    const cleanPhone =
      phone?.trim() || null;

    const cleanNationalId =
      nationalId?.trim() || null;

    if (cleanNationalId) {
      const existingPatient =
        await patientModels.findOne({
          nationalId: cleanNationalId,

          _id: {
            $ne: req.params.id,
          },

          isActive: true,
        });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message:
            "A patient with this national ID already exists",
        });
      }
    }

    if (cleanPhone) {
      const existingPatient =
        await patientModels.findOne({
          phone: cleanPhone,

          _id: {
            $ne: req.params.id,
          },

          isActive: true,
        });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message:
            "A patient with this phone number already exists",
        });
      }
    }

    const patient =
      await patientModels.findByIdAndUpdate(
        req.params.id,
        {
          name: name.trim(),

          phone: cleanPhone,

          email:
            email?.trim() || null,

          nationalId:
            cleanNationalId,

          dateOfBirth:
            dateOfBirth || null,

          gender:
            gender || null,

          address:
            address?.trim() || null,

          ...(typeof isActive === "boolean"
            ? { isActive }
            : {}),
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          "Patient not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Patient updated successfully",
      patient,
    });
  } catch (error) {
    console.error(
      "Update patient error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update patient",
      error: error.message,
    });
  }
};

const deactivatePatient = async (req, res) => {
  try {
    const patient =
      await patientModels.findByIdAndUpdate(
        req.params.id,
        {
          isActive: false,
        },
        {
          new: true,
        }
      );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          "Patient not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Patient deactivated successfully",
    });
  } catch (error) {
    console.error(
      "Deactivate patient error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to deactivate patient",
      error: error.message,
    });
  }
};

module.exports = {
  getAllPatient,
  getSinglePatient,
  getPatientDetails,
  createPatient,
  updatePatient,
  deactivatePatient,
};