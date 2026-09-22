const mongoose = require("mongoose");

const patientModels = require("../models/patient.models");
const visitModels = require("../models/visit.model");
const prescriptionModels = require("../models/prescription.models");
const saleModels = require("../models/sale.models");
const operationModels = require("../models/operation.model");
const paymentModels = require("../models/payment.models");

const allowedGenders = [
  "male",
  "female",
];

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
};

// Get All Patients
const getAllPatient = async (req, res) => {
  try {
    const { search,isActive,page = 1,limit = 10} = req.query;

    const filter = {};

    if (isActive !== undefined) {
      if (isActive !== "true" && isActive !== "false") {
        return res.status(400).json({success: false,message: req.t("patients.invalidIsActive")});
      }

      filter.isActive = isActive === "true";
    } else {
      filter.isActive = true;
    }

    if (search?.trim()) {
      const searchValue = search.trim();

      filter.$or = [
        {
          name: { $regex: searchValue, $options: "i",
          },
        },
        {
          phone: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          nationalId: {
            $regex: searchValue,
            $options: "i",
          },
        },
      ];
    }

    const pageNumber = Math.max( Number(page) || 1,
      1
    );

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1),100);

    const skip =(pageNumber - 1) * limitNumber;

    const total = await patientModels.countDocuments(filter);

    const patients = await patientModels.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean();

    if (!patients.length) {
      return res.status(200).json({
        success: true,
        patients: [],
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(
            total / limitNumber
          ),
        },
      });
    }

    const patientIds =
      patients.map(
        (patient) => patient._id
      );

    const [
      visits,
      operations,
      sales,
    ] = await Promise.all([
      visitModels
        .find({
          patient: {
            $in: patientIds,
          },
        })
        .select(
          "_id patient consultationFee status"
        )
        .lean(),

      operationModels
        .find({
          patient: {
            $in: patientIds,
          },
        })
        .select(
          "_id patient totalAmount discount status"
        )
        .lean(),

      saleModels
        .find({
          patient: {
            $in: patientIds,
          },
        })
        .select(
          "_id patient totalAmount discount status"
        )
        .lean(),
    ]);

    const validVisits =
      visits.filter(
        (visit) =>
          visit.status !== "cancelled"
      );

    const validOperations =
      operations.filter(
        (operation) =>
          operation.status !== "cancelled"
      );

    const validSales =
      sales.filter(
        (sale) =>
          sale.status !== "cancelled"
      );

    const visitIds =
      validVisits.map(
        (visit) => visit._id
      );

    const operationIds =
      validOperations.map(
        (operation) => operation._id
      );

    const saleIds =
      validSales.map(
        (sale) => sale._id
      );

    const paymentConditions = [
      {
        patient: {
          $in: patientIds,
        },
      },
    ];

    if (visitIds.length) {
      paymentConditions.push({
        visit: {
          $in: visitIds,
        },
      });
    }

    if (operationIds.length) {
      paymentConditions.push({
        operation: {
          $in: operationIds,
        },
      });
    }

    if (saleIds.length) {
      paymentConditions.push({
        sale: {
          $in: saleIds,
        },
      });
    }

    const payments =
      await paymentModels
        .find({
          status: "completed",
          $or: paymentConditions,
        })
        .select(
          "patient visit operation sale amount type"
        )
        .lean();

    const accounts = new Map();

    patientIds.forEach(
      (patientId) => {
        accounts.set(
          patientId.toString(),
          {
            charges: 0,
            paid: 0,
            due: 0,
          }
        );
      }
    );

    validVisits.forEach(
      (visit) => {
        const account =
          accounts.get(
            visit.patient.toString()
          );

        if (!account) return;

        account.charges += Number(
          visit.consultationFee || 0
        );
      }
    );

    validOperations.forEach(
      (operation) => {
        const account =
          accounts.get(
            operation.patient.toString()
          );

        if (!account) return;

        account.charges += Number(
          operation.totalAmount || 0
        );
      }
    );

    validSales.forEach(
      (sale) => {
        const account =
          accounts.get(
            sale.patient.toString()
          );

        if (!account) return;

        account.charges += Number(
          sale.totalAmount || 0
        );
      }
    );

    const visitPatientMap =
      new Map();

    validVisits.forEach(
      (visit) => {
        visitPatientMap.set(
          visit._id.toString(),
          visit.patient.toString()
        );
      }
    );

    const operationPatientMap =
      new Map();

    validOperations.forEach(
      (operation) => {
        operationPatientMap.set(
          operation._id.toString(),
          operation.patient.toString()
        );
      }
    );

    const salePatientMap =
      new Map();

    validSales.forEach(
      (sale) => {
        salePatientMap.set(
          sale._id.toString(),
          sale.patient.toString()
        );
      }
    );

    payments.forEach(
      (payment) => {
        let patientId =
          payment.patient
            ? payment.patient.toString()
            : null;

        if (
          !patientId &&
          payment.visit
        ) {
          patientId =
            visitPatientMap.get(
              payment.visit.toString()
            );
        }

        if (
          !patientId &&
          payment.operation
        ) {
          patientId =
            operationPatientMap.get(
              payment.operation.toString()
            );
        }

        if (
          !patientId &&
          payment.sale
        ) {
          patientId =
            salePatientMap.get(
              payment.sale.toString()
            );
        }

        if (!patientId) return;

        const account =
          accounts.get(patientId);

        if (!account) return;

        account.paid += Number(
          payment.amount || 0
        );
      }
    );

    accounts.forEach(
      (account) => {
        account.due = Math.max(
          account.charges -
            account.paid,
          0
        );
      }
    );

    const patientsWithAccounts =
      patients.map(
        (patient) => ({
          ...patient,
          account:
            accounts.get(
              patient._id.toString()
            ) || {
              charges: 0,
              paid: 0,
              due: 0,
            },
        })
      );

    return res.status(200).json({
      success: true,
      patients:
        patientsWithAccounts,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get Patients Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

// Get Single Patient
const getSinglePatient = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const patient =
      await patientModels.findOne({
        _id: id,
        isActive: true,
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "patients.notFound"
        ),
      });
    }

    return res.status(200).json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error(
      "Get Single Patient Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

// Get Patient Details

const getPatientDetails = async ( req,res) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const patient =
      await patientModels.findOne({
        _id: id,
        isActive: true,
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "patients.notFound"
        ),
      });
    }

    const [
      visits,
      prescriptions,
      operations,
      sales,
    ] = await Promise.all([
      visitModels
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
        }),

      prescriptionModels
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
        }),

      operationModels
        .find({
          patient: id,
        })
        .populate(
          "doctor",
          "name phone email"
        )
        .populate(
          "specialty",
          "name"
        )
        .populate(
          "createdBy",
          "name role"
        )
        .sort({
          operationDate: -1,
        }),

      saleModels
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
        }),
    ]);

    const validVisits =
      visits.filter(
        (visit) =>
          visit.status !== "cancelled"
      );

    const validOperations =
      operations.filter(
        (operation) =>
          operation.status !== "cancelled"
      );

    const validSales =
      sales.filter(
        (sale) =>
          sale.status !== "cancelled"
      );

    const visitIds =
      validVisits.map(
        (visit) => visit._id
      );

    const operationIds =
      validOperations.map(
        (operation) => operation._id
      );

    const saleIds =
      validSales.map(
        (sale) => sale._id
      );

    const paymentOrConditions = [
      {
        patient: id,
      },
    ];

    if (visitIds.length) {
      paymentOrConditions.push({
        visit: {
          $in: visitIds,
        },
      });
    }

    if (operationIds.length) {
      paymentOrConditions.push({
        operation: {
          $in: operationIds,
        },
      });
    }

    if (saleIds.length) {
      paymentOrConditions.push({
        sale: {
          $in: saleIds,
        },
      });
    }

    const payments =
      await paymentModels
        .find({
          $or: paymentOrConditions,
        })
        .populate(
          "sale",
          "totalAmount discount paymentStatus status"
        )
        .populate(
          "visit",
          "consultationFee paymentStatus status"
        )
        .populate(
          "operation",
          "operationName totalAmount doctorFeeAmount paymentStatus status"
        )
        .populate(
          "receivedBy",
          "name role"
        )
        .populate(
          "cashDrawer",
          "status openingBalance expectedCash actualCash difference"
        )
        .sort({
          createdAt: -1,
        });

    const completedPayments =
      payments.filter(
        (payment) =>
          payment.status === "completed"
      );

    const visitCharges =
      validVisits.reduce(
        (total, visit) =>
          total +
          Number(
            visit.consultationFee || 0
          ),
        0
      );

    const operationCharges =
      validOperations.reduce(
        (total, operation) =>
          total +
          Number(
            operation.totalAmount || 0
          ),
        0
      );

    const salesCharges =
      validSales.reduce(
        (total, sale) =>
          total +
          Number(
            sale.totalAmount || 0
          ),
        0
      );

    const visitDiscounts = 0;

    const operationDiscounts =
      validOperations.reduce(
        (total, operation) =>
          total +
          Number(
            operation.discount || 0
          ),
        0
      );

    const salesDiscounts =
      validSales.reduce(
        (total, sale) =>
          total +
          Number(
            sale.discount || 0
          ),
        0
      );

    const totalDiscounts =
      visitDiscounts +
      operationDiscounts +
      salesDiscounts;

    const visitPaid =
      completedPayments
        .filter(
          (payment) =>
            payment.type === "visit"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(
              payment.amount || 0
            ),
          0
        );

    const operationPaid =
      completedPayments
        .filter(
          (payment) =>
            payment.type ===
            "operation"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(
              payment.amount || 0
            ),
          0
        );

    const salesPaid =
      completedPayments
        .filter(
          (payment) =>
            payment.type === "sale"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(
              payment.amount || 0
            ),
          0
        );

    const totalPaid =
      visitPaid +
      operationPaid +
      salesPaid;

    const totalCharges =
      visitCharges +
      operationCharges +
      salesCharges;

    const totalRemaining =
      Math.max(
        totalCharges - totalPaid,
        0
      );

    const visitRemaining =
      Math.max(
        visitCharges - visitPaid,
        0
      );

    const operationRemaining =
      Math.max(
        operationCharges -
          operationPaid,
        0
      );

    const salesRemaining =
      Math.max(
        salesCharges - salesPaid,
        0
      );

    const visitsWithAccount =
      validVisits.map((visit) => {
        const paid =
          completedPayments
            .filter(
              (payment) =>
                payment.type ===
                  "visit" &&
                String(
                  payment.visit?._id ||
                    payment.visit
                ) ===
                  String(visit._id)
            )
            .reduce(
              (total, payment) =>
                total +
                Number(
                  payment.amount || 0
                ),
              0
            );

        const remaining =
          Math.max(
            Number(
              visit.consultationFee || 0
            ) - paid,
            0
          );

        return {
          ...visit.toObject(),
          paidAmount: paid,
          remainingAmount:
            remaining,
          paymentStatus:
            remaining <= 0
              ? "paid"
              : paid > 0
              ? "partial"
              : "pending",
        };
      });

    const operationsWithAccount =
      validOperations.map(
        (operation) => {
          const paid =
            completedPayments
              .filter(
                (payment) =>
                  payment.type ===
                    "operation" &&
                  String(
                    payment.operation?._id ||
                      payment.operation
                  ) ===
                    String(
                      operation._id
                    )
              )
              .reduce(
                (total, payment) =>
                  total +
                  Number(
                    payment.amount || 0
                  ),
                0
              );

          const remaining =
            Math.max(
              Number(
                operation.totalAmount ||
                  0
              ) - paid,
              0
            );

          return {
            ...operation.toObject(),
            paidAmount: paid,
            remainingAmount:
              remaining,
            paymentStatus:
              remaining <= 0
                ? "paid"
                : paid > 0
                ? "partial"
                : "unpaid",
          };
        }
      );

    const salesWithAccount =
      validSales.map((sale) => {
        const paid =
          completedPayments
            .filter(
              (payment) =>
                payment.type === "sale" &&
                String(
                  payment.sale?._id ||
                    payment.sale
                ) ===
                  String(sale._id)
            )
            .reduce(
              (total, payment) =>
                total +
                Number(
                  payment.amount || 0
                ),
              0
            );

        const remaining =
          Math.max(
            Number(
              sale.totalAmount || 0
            ) - paid,
            0
          );

        return {
          ...sale.toObject(),
          paidAmount: paid,
          remainingAmount:
            remaining,
          paymentStatus:
            remaining <= 0
              ? "paid"
              : paid > 0
              ? "partial"
              : "unpaid",
        };
      });

    const account = {
      charges: {
        visits: visitCharges,
        operations:
          operationCharges,
        sales: salesCharges,
        total: totalCharges,
      },

      discounts: {
        visits: visitDiscounts,
        operations:
          operationDiscounts,
        sales: salesDiscounts,
        total: totalDiscounts,
      },

      payments: {
        visits: visitPaid,
        operations: operationPaid,
        sales: salesPaid,
        total: totalPaid,
      },

      balance: totalRemaining,
    };

    return res.status(200).json({
      success: true,

      patient,

      summary: {
        visitsCount:
          visits.length,

        operationsCount:
          operations.length,

        prescriptionsCount:
          prescriptions.length,

        salesCount:
          sales.length,

        paymentsCount:
          completedPayments.length,

        visitTotal: visitCharges,
        visitPaid,
        visitRemaining,

        operationTotal:
          operationCharges,

        operationPaid,
        operationRemaining,

        salesTotal:
          salesCharges,

        salesPaid,
        salesRemaining,

        totalDiscounts,

        totalCharges,
        totalPaid,
        totalRemaining,

        balance: totalRemaining,
      },

      account,

      visits: visitsWithAccount,

      operations:
        operationsWithAccount,

      prescriptions,

      sales: salesWithAccount,

      payments,
    });
  } catch (error) {
    console.error(
      "Get Patient Details Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

// Create Patient
const createPatient = async (
  req,
  res
) => {
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

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "patients.nameRequired"
        ),
      });
    }

    const cleanPhone =
      typeof phone === "string" &&
      phone.trim()
        ? phone.trim()
        : null;

    const cleanNationalId =
      typeof nationalId === "string" &&
      nationalId.trim()
        ? nationalId.trim()
        : null;

    const cleanEmail =
      typeof email === "string" &&
      email.trim()
        ? email.trim().toLowerCase()
        : null;

    const cleanAddress =
      typeof address === "string" &&
      address.trim()
        ? address.trim()
        : null;

    if (
      cleanEmail &&
      !isValidEmail(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "patients.invalidEmail"
        ),
      });
    }

    if (
      gender !== undefined &&
      gender !== null &&
      !allowedGenders.includes(gender)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "patients.invalidGender"
        ),
      });
    }

    if (dateOfBirth !== undefined) {
      if (
        dateOfBirth !== null &&
        isNaN(
          new Date(
            dateOfBirth
          ).getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "patients.invalidDateOfBirth"
          ),
        });
      }
    }

    if (cleanNationalId) {
      const existingPatient =
        await patientModels.findOne({
          nationalId:
            cleanNationalId,
          isActive: true,
        });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message: req.t(
            "patients.nationalIdAlreadyExists"
          ),
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
          message: req.t(
            "patients.phoneAlreadyExists"
          ),
        });
      }
    }

    const patient =
      await patientModels.create({
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        nationalId:
          cleanNationalId,
        dateOfBirth:
          dateOfBirth || null,
        gender: gender || null,
        address: cleanAddress,
        isActive: true,
      });

    return res.status(201).json({
      success: true,
      message: req.t(
        "patients.createdSuccessfully"
      ),
      patient,
    });
  } catch (error) {
    console.error(
      "Create Patient Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

const updatePatient = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

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

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "patients.nameRequired"
        ),
      });
    }

    if (
      gender !== undefined &&
      gender !== null &&
      !allowedGenders.includes(gender)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "patients.invalidGender"
        ),
      });
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "patients.invalidIsActive"
          ),
        });
      }
    }

    const cleanPhone =
      typeof phone === "string" &&
      phone.trim()
        ? phone.trim()
        : null;

    const cleanNationalId =
      typeof nationalId === "string" &&
      nationalId.trim()
        ? nationalId.trim()
        : null;

    const cleanEmail =
      typeof email === "string" &&
      email.trim()
        ? email.trim().toLowerCase()
        : null;

    const cleanAddress =
      typeof address === "string" &&
      address.trim()
        ? address.trim()
        : null;

    if (
      cleanEmail &&
      !isValidEmail(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "patients.invalidEmail"
        ),
      });
    }

    if (dateOfBirth !== undefined) {
      if (
        dateOfBirth !== null &&
        isNaN(
          new Date(
            dateOfBirth
          ).getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "patients.invalidDateOfBirth"
          ),
        });
      }
    }

    if (cleanNationalId) {
      const existingPatient =
        await patientModels.findOne({
          nationalId:
            cleanNationalId,
          _id: {
            $ne: id,
          },
          isActive: true,
        });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message: req.t(
            "patients.nationalIdAlreadyExists"
          ),
        });
      }
    }

    if (cleanPhone) {
      const existingPatient =
        await patientModels.findOne({
          phone: cleanPhone,
          _id: {
            $ne: id,
          },
          isActive: true,
        });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message: req.t(
            "patients.phoneAlreadyExists"
          ),
        });
      }
    }

    const patient =
      await patientModels.findByIdAndUpdate(
        id,
        {
          name: name.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          nationalId:
            cleanNationalId,
          dateOfBirth:
            dateOfBirth || null,
          gender: gender || null,
          address: cleanAddress,

          ...(isActive !== undefined
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
        message: req.t(
          "patients.notFound"
        ),
      });
    }

    return res.status(200).json({
      success: true,
      message: req.t(
        "patients.updatedSuccessfully"
      ),
      patient,
    });
  } catch (error) {
    console.error(
      "Update Patient Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

// Deactivate Patient
const deactivatePatient = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const patient =
      await patientModels.findById(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "patients.notFound"
        ),
      });
    }

    if (!patient.isActive) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "patients.alreadyDeactivated"
        ),
      });
    }

    patient.isActive = false;

    await patient.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "patients.deactivatedSuccessfully"
      ),
    });
  } catch (error) {
    console.error(
      "Deactivate Patient Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
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