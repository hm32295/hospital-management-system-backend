
const patientModels = require("../models/patient.models");
const visitModels = require("../models/visit.model");
const prescriptionModels = require("../models/prescription.models");
const saleModels = require("../models/sale.models");
const operationModels = require("../models/operation.model");
const paymentModels = require("../models/payment.models");

const getAllPatient = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const filter = {
      isActive: true,
    };

    if (search?.trim()) {
      const searchValue = search.trim();

      filter.$or = [
        {
          name: {
            $regex: searchValue,
            $options: "i",
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

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const total =
      await patientModels.countDocuments(
        filter
      );

    const patients =
      await patientModels
        .find(filter)
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

    /*
      =========================
      GET PATIENT TRANSACTIONS
      =========================
    */

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

    /*
      =========================
      VALID TRANSACTIONS
      =========================
    */

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

    /*
      =========================
      TRANSACTION IDS
      =========================
    */

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

    /*
      =========================
      GET PAYMENTS
      =========================

      We check both patient and
      transaction references because
      some old payments may have
      patient = null.
    */

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

    /*
      =========================
      CREATE ACCOUNT MAP
      =========================
    */

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

    /*
      =========================
      ADD VISIT CHARGES
      =========================
    */

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

    /*
      =========================
      ADD OPERATION CHARGES
      =========================
    */

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

    /*
      =========================
      ADD SALES CHARGES
      =========================
    */

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

    /*
      =========================
      MAP TRANSACTION -> PATIENT
      =========================

      This makes finding the patient
      much faster than using .find()
      for every payment.
    */

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

    /*
      =========================
      ADD PAYMENTS
      =========================
    */

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

    /*
      =========================
      CALCULATE DUE
      =========================
    */

    accounts.forEach(
      (account) => {
        account.due = Math.max(
          account.charges -
            account.paid,
          0
        );
      }
    );

    /*
      =========================
      ATTACH ACCOUNT
      =========================
    */

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
      "Get patients error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get patients",
      error: error.message,
    });
  }
};


const getPatientDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await patientModels.findOne({
      _id: id,
      isActive: true,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
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
        .populate("specialty", "name")
        .populate("doctor", "name phone")
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

    const validVisits = visits.filter(
      (visit) =>
        visit.status !== "cancelled"
    );

    const validOperations =
      operations.filter(
        (operation) =>
          operation.status !== "cancelled"
      );

    const validSales = sales.filter(
      (sale) =>
        sale.status !== "cancelled"
    );

    const visitIds = validVisits.map(
      (visit) => visit._id
    );

    const operationIds =
      validOperations.map(
        (operation) => operation._id
      );

    const saleIds = validSales.map(
      (sale) => sale._id
    );

    /*
      Get all payments belonging to this patient.

      We don't depend only on payment.patient
      because old payments may have the patient
      missing while still being linked to a
      visit, operation, or sale.
    */
    const payments =
      await paymentModels
        .find({
          $or: [
            {
              patient: id,
            },

            {
              visit: {
                $in: visitIds,
              },
            },

            {
              operation: {
                $in: operationIds,
              },
            },

            {
              sale: {
                $in: saleIds,
              },
            },
          ],
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

    /*
      =========================
      CHARGES
      =========================
    */

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

    /*
      =========================
      DISCOUNTS
      =========================
    */

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

    /*
      =========================
      PAYMENTS BY SOURCE
      =========================
    */

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
            payment.type === "operation"
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

    /*
      =========================
      TOTAL ACCOUNT
      =========================
    */

    const totalCharges =
      visitCharges +
      operationCharges +
      salesCharges;

    const totalRemaining =
      Math.max(
        totalCharges - totalPaid,
        0
      );

    /*
      =========================
      REMAINING BY SOURCE
      =========================
    */

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

    /*
      =========================
      ADD REAL PAYMENT DATA
      TO EACH VISIT
      =========================
    */

    const visitsWithAccount =
      validVisits.map((visit) => {
        const paid =
          completedPayments
            .filter(
              (payment) =>
                payment.type === "visit" &&
                String(
                  payment.visit?._id ||
                    payment.visit
                ) === String(visit._id)
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
          remainingAmount: remaining,
          paymentStatus:
            remaining <= 0
              ? "paid"
              : paid > 0
              ? "partial"
              : "pending",
        };
      });

    /*
      =========================
      ADD REAL PAYMENT DATA
      TO EACH OPERATION
      =========================
    */

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
                    String(operation._id)
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
                operation.totalAmount || 0
              ) - paid,
              0
            );

          return {
            ...operation.toObject(),
            paidAmount: paid,
            remainingAmount: remaining,
            paymentStatus:
              remaining <= 0
                ? "paid"
                : paid > 0
                ? "partial"
                : "unpaid",
          };
        }
      );

    /*
      =========================
      ADD REAL PAYMENT DATA
      TO EACH SALE
      =========================
    */

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
                ) === String(sale._id)
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
          remainingAmount: remaining,
          paymentStatus:
            remaining <= 0
              ? "paid"
              : paid > 0
              ? "partial"
              : "unpaid",
        };
      });

    /*
      =========================
      ACCOUNT
      =========================
    */

    const account = {
      charges: {
        visits: visitCharges,
        operations: operationCharges,
        sales: salesCharges,
        total: totalCharges,
      },

      discounts: {
        visits: visitDiscounts,
        operations: operationDiscounts,
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
        visitsCount: visits.length,

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

        salesTotal: salesCharges,
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