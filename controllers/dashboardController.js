const Sale = require("../models/sale.models");
const Medicine = require("../models/medicine.models");
const MedicineBatch = require("../models/medicineBatch.models");
const Visit = require("../models/visit.model");
const Operation = require("../models/operation.model");
const Patient = require("../models/patient.models");
const Payment = require("../models/payment.models");

const LOW_STOCK_THRESHOLD = 10;

const getDashboard = async (req, res) => {
  try {
    const { month } = req.query;
    const selectedMonth = month || new Date().toISOString().slice(0, 7);

    if (typeof selectedMonth !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: req.t("dashboard.invalidMonth"),
      });
    }

    const [year, monthNumber] = selectedMonth.split("-").map(Number);
    const from = new Date(year, monthNumber - 1, 1);
    const to = new Date(year, monthNumber, 1);

    const today = new Date();

    const expiry30 = new Date(today);
    expiry30.setDate(expiry30.getDate() + 30);

    const expiry90 = new Date(today);
    expiry90.setDate(expiry90.getDate() + 90);

    const [
      salesSummary,
      dailySales,
      topSellingMedicines,
      medicinesSoldSummary,
    ] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            count: { $sum: 1 },
            paid: { $sum: "$paidAmount" },
            remaining: { $sum: "$remainingAmount" },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "Africa/Cairo",
              },
            },
            amount: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: from, $lt: to },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.medicine",
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "medicines",
            localField: "_id",
            foreignField: "_id",
            as: "medicine",
          },
        },
        {
          $unwind: {
            path: "$medicine",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            medicine: {
              _id: "$medicine._id",
              name: "$medicine.name",
              genericName: "$medicine.genericName",
              manufacturer: "$medicine.manufacturer",
            },
            quantity: 1,
            revenue: 1,
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: from, $lt: to },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: null,
            quantity: { $sum: "$items.quantity" },
          },
        },
      ]),
    ]);

    const [
      monthlyPayments,
      salePayments,
      visitPayments,
      operationPayments,
    ] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            type: "sale",
            status: "completed",
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            type: "visit",
            status: "completed",
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            type: "operation",
            status: "completed",
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const [
      totalPatients,
      newPatients,
      monthlyVisitPatients,
      frequentPatients,
      returningPatientIds,
    ] = await Promise.all([
      Patient.countDocuments({ isActive: true }),
      Patient.countDocuments({
        createdAt: { $gte: from, $lt: to },
        isActive: true,
      }),
      Visit.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: "$patient",
            visits: { $sum: 1 },
          },
        },
      ]),
      Visit.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: "$patient",
            visits: { $sum: 1 },
          },
        },
        { $sort: { visits: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "patients",
            localField: "_id",
            foreignField: "_id",
            as: "patient",
          },
        },
        {
          $unwind: {
            path: "$patient",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            patient: {
              _id: "$patient._id",
              name: "$patient.name",
              phone: "$patient.phone",
            },
            visits: 1,
          },
        },
      ]),
      Visit.distinct("patient", {
        status: { $ne: "cancelled" },
        createdAt: { $lt: from },
      }),
    ]);

    const monthlyPatientIds = monthlyVisitPatients.map((item) =>
      item._id.toString()
    );

    const returningPatients = returningPatientIds.filter((patientId) =>
      monthlyPatientIds.includes(patientId.toString())
    ).length;

    const [
      visitSummary,
      visitTypeSummary,
      specialties,
    ] = await Promise.all([
      Visit.aggregate([
        {
          $match: {
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Visit.aggregate([
        {
          $match: {
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: "$visitType",
            count: { $sum: 1 },
          },
        },
      ]),
      Visit.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: "$specialty",
            visits: { $sum: 1 },
          },
        },
        { $sort: { visits: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "specialties",
            localField: "_id",
            foreignField: "_id",
            as: "specialty",
          },
        },
        {
          $unwind: {
            path: "$specialty",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            specialty: {
              _id: "$specialty._id",
              name: "$specialty.name",
            },
            visits: 1,
          },
        },
      ]),
    ]);

    const [operationSummary, doctorActivity] = await Promise.all([
      Operation.aggregate([
        {
          $match: {
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
            paidAmount: { $sum: "$paidAmount" },
            remainingAmount: { $sum: "$remainingAmount" },
          },
        },
      ]),
      Operation.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: from, $lt: to },
          },
        },
        {
          $group: {
            _id: "$doctor",
            operations: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { operations: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "doctors",
            localField: "_id",
            foreignField: "_id",
            as: "doctor",
          },
        },
        {
          $unwind: {
            path: "$doctor",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            doctor: {
              _id: "$doctor._id",
              name: "$doctor.name",
            },
            operations: 1,
            revenue: 1,
          },
        },
      ]),
    ]);

    const [
      medicinesCount,
      lowStockBatches,
      outOfStockBatches,
      expiredBatchesList,
      expiring30,
      expiring31To90,
    ] = await Promise.all([
      Medicine.countDocuments({ isActive: true }),
      MedicineBatch.countDocuments({
        isActive: true,
        quantity: { $gt: 0, $lte: LOW_STOCK_THRESHOLD },
      }),
      MedicineBatch.countDocuments({
        isActive: true,
        quantity: 0,
      }),
      MedicineBatch.find({
        isActive: true,
        quantity: { $gt: 0 },
        expiryDate: { $lt: today },
      })
        .populate("medicine", "name genericName manufacturer")
        .sort({ expiryDate: 1 })
        .limit(20)
        .lean(),
      MedicineBatch.find({
        isActive: true,
        quantity: { $gt: 0 },
        expiryDate: {
          $gte: today,
          $lte: expiry30,
        },
      })
        .populate("medicine", "name genericName manufacturer")
        .sort({ expiryDate: 1 })
        .limit(20)
        .lean(),
      MedicineBatch.find({
        isActive: true,
        quantity: { $gt: 0 },
        expiryDate: {
          $gt: expiry30,
          $lte: expiry90,
        },
      })
        .populate("medicine", "name genericName manufacturer")
        .sort({ expiryDate: 1 })
        .limit(20)
        .lean(),
    ]);

    const addDaysRemaining = (batch) => {
      const diffMs =
        new Date(batch.expiryDate).getTime() - today.getTime();

      return {
        ...batch,
        daysRemaining: Math.ceil(
          diffMs / (1000 * 60 * 60 * 24)
        ),
      };
    };

    const expiredAlerts = expiredBatchesList.map((batch) => ({
      ...batch,
      daysRemaining:
        Math.floor(
          (today.getTime() -
            new Date(batch.expiryDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) * -1,
    }));

    const within30Days = expiring30.map(addDaysRemaining);
    const within31To90Days = expiring31To90.map(addDaysRemaining);

    const medicineSales = await Sale.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: from, $lt: to },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.medicine",
          soldQuantity: { $sum: "$items.quantity" },
          salesAmount: { $sum: "$items.total" },
        },
      },
      { $sort: { soldQuantity: 1 } },
    ]);

    const soldMedicineIds = medicineSales.map((item) => item._id);

    const [slowMovingMedicines, noSalesMedicines] = await Promise.all([
      Medicine.aggregate([
        {
          $match: {
            isActive: true,
            _id: { $in: soldMedicineIds },
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { medicineId: "$_id" },
            pipeline: [
              {
                $match: {
                  status: "completed",
                  createdAt: { $gte: from, $lt: to },
                  $expr: {
                    $in: [
                      "$$medicineId",
                      "$items.medicine",
                    ],
                  },
                },
              },
              { $unwind: "$items" },
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$items.medicine",
                      "$$medicineId",
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  soldQuantity: { $sum: "$items.quantity" },
                  salesAmount: { $sum: "$items.total" },
                },
              },
            ],
            as: "sales",
          },
        },
        {
          $addFields: {
            soldQuantity: {
              $ifNull: [
                { $arrayElemAt: ["$sales.soldQuantity", 0] },
                0,
              ],
            },
            salesAmount: {
              $ifNull: [
                { $arrayElemAt: ["$sales.salesAmount", 0] },
                0,
              ],
            },
          },
        },
        { $sort: { soldQuantity: 1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            name: 1,
            genericName: 1,
            manufacturer: 1,
            soldQuantity: 1,
            salesAmount: 1,
          },
        },
      ]),
      Medicine.aggregate([
        {
          $match: {
            isActive: true,
            _id: { $nin: soldMedicineIds },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            genericName: 1,
            manufacturer: 1,
          },
        },
        { $limit: 10 },
      ]),
    ]);

    const getStatusCount = (data, status) => {
      const item = data.find((entry) => entry._id === status);
      return item?.count || 0;
    };

    const getVisitTypeCount = (data, type) => {
      const item = data.find((entry) => entry._id === type);
      return item?.count || 0;
    };

    const sales = salesSummary[0] || {
      total: 0,
      count: 0,
      paid: 0,
      remaining: 0,
    };

    const paymentTotal = monthlyPayments.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );

    const visitPayment = Number(visitPayments[0]?.total || 0);
    const operationPayment = Number(operationPayments[0]?.total || 0);
    const salePayment = Number(salePayments[0]?.total || 0);

    const operationTotal = operationSummary.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    );

    const operationPaid = operationSummary.reduce(
      (sum, item) => sum + Number(item.paidAmount || 0),
      0
    );

    const operationRemaining = operationSummary.reduce(
      (sum, item) => sum + Number(item.remainingAmount || 0),
      0
    );

    const totalVisits = monthlyVisitPatients.reduce(
      (sum, item) => sum + Number(item.visits || 0),
      0
    );

    const totalOperations = operationSummary.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0
    );

    return res.status(200).json({
      success: true,
      period: {
        month: selectedMonth,
        from,
        to,
      },
      overview: {
        sales: sales.total,
        salesCount: sales.count,
        salesPaid: sales.paid,
        salesRemaining: sales.remaining,
        payments: paymentTotal,
        patients: totalPatients,
        newPatients,
        visits: totalVisits,
        operations: totalOperations,
        medicines: medicinesCount,
        medicinesSold: medicinesSoldSummary[0]?.quantity || 0,
        lowStock: lowStockBatches,
        outOfStock: outOfStockBatches,
        expiredBatches: expiredBatchesList.length,
        expiringSoon: expiring30.length,
      },
      sales: {
        total: sales.total,
        count: sales.count,
        averageSale:
          sales.count > 0
            ? Number((sales.total / sales.count).toFixed(2))
            : 0,
        daily: dailySales.map((item) => ({
          date: item._id,
          amount: item.amount,
          count: item.count,
        })),
      },
      payments: {
        total: paymentTotal,
        sales: salePayment,
        visits: visitPayment,
        operations: operationPayment,
      },
      topSellingMedicines,
      slowMovingMedicines,
      noSalesMedicines,
      expiryAlerts: {
        expired: expiredAlerts,
        within30Days,
        within90Days: within31To90Days,
      },
      visits: {
        total: totalVisits,
        first: getVisitTypeCount(visitTypeSummary, "first"),
        followUp: getVisitTypeCount(visitTypeSummary, "follow_up"),
        completed: getStatusCount(visitSummary, "completed"),
        waiting: getStatusCount(visitSummary, "waiting"),
        inConsultation: getStatusCount(
          visitSummary,
          "in_consultation"
        ),
        cancelled: getStatusCount(visitSummary, "cancelled"),
      },
      operations: {
        total: totalOperations,
        completed: getStatusCount(
          operationSummary,
          "completed"
        ),
        pending: getStatusCount(
          operationSummary,
          "pending"
        ),
        cancelled: getStatusCount(
          operationSummary,
          "cancelled"
        ),
        totalAmount: operationTotal,
        paidAmount: operationPaid,
        remainingAmount: operationRemaining,
      },
      frequentPatients,
      specialties,
      doctorActivity,
      patientActivity: {
        newPatients,
        returningPatients,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("dashboard.fetchFailed"),
    });
  }
};

module.exports = {
  getDashboard,
};