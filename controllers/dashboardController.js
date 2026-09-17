const Sale = require("../models/sale.models");
const Payment = require("../models/payment.models");
const Expense = require("../models/expense.models");
const CashDrawer = require("../models/cashDrawer.models");
const Medicine = require("../models/medicine.models");
const MedicineBatch = require("../models/medicineBatch.models");
const Dispensing = require("../models/dispensing.models");


// ==========================================
// Dashboard
// ==========================================

const getDashboard = async (req, res) => {
  try {
    // ==========================================
    // Dates
    // ==========================================

    const now = new Date();

    // Start of today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Start of tomorrow
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // Start of week - Monday
    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay();

    const diffToMonday = day === 0 ? 6 : day - 1;

    startOfWeek.setDate(
      startOfWeek.getDate() - diffToMonday
    );

    // Start of month
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    // ==========================================
    // Expiry Date
    // ==========================================

    // Medicines expiring within 30 days
    const expiryLimit = new Date(startOfToday);
    expiryLimit.setDate(expiryLimit.getDate() + 30);

    // ==========================================
    // Low Stock Threshold
    // ==========================================

    const LOW_STOCK_LIMIT = 10;


    // ==========================================
    // Run Queries
    // ==========================================

    const [
      // ------------------------------
      // Financial
      // ------------------------------

      todaySales,
      weekSales,
      monthSales,

      todayPayments,
      todayExpenses,

      // ------------------------------
      // Cash Drawer
      // ------------------------------

      currentCashDrawer,

      // ------------------------------
      // Inventory
      // ------------------------------

      totalMedicines,
      lowStockBatches,
      expiringBatches,
      expiredBatches,

      // ------------------------------
      // Recent
      // ------------------------------

      recentSales,
      recentDispensing,

    ] = await Promise.all([


      // ==========================================
      // TODAY SALES
      // ==========================================

      Sale.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfToday,
              $lt: startOfTomorrow,
            },
            status: "completed",
          },
        },

        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),


      // ==========================================
      // WEEK SALES
      // ==========================================

      Sale.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfWeek,
              $lt: startOfTomorrow,
            },
            status: "completed",
          },
        },

        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),


      // ==========================================
      // MONTH SALES
      // ==========================================

      Sale.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfMonth,
              $lt: startOfTomorrow,
            },
            status: "completed",
          },
        },

        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),


      // ==========================================
      // TODAY PAYMENTS
      // ==========================================

      Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfToday,
              $lt: startOfTomorrow,
            },
            status: "completed",
          },
        },

        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),


      // ==========================================
      // TODAY EXPENSES
      // ==========================================

      Expense.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfToday,
              $lt: startOfTomorrow,
            },
            status: "completed",
          },
        },

        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),


      // ==========================================
      // CURRENT CASH DRAWER
      // ==========================================

      CashDrawer.findOne({
        status: "open",
      })
        .populate("openedBy", "name email")
        .lean(),


      // ==========================================
      // TOTAL ACTIVE MEDICINES
      // ==========================================

      Medicine.countDocuments({
        isActive: true,
      }),


      // ==========================================
      // LOW STOCK
      // ==========================================

      MedicineBatch.countDocuments({
        isActive: true,
        quantity: {
          $gt: 0,
          $lte: LOW_STOCK_LIMIT,
        },
      }),


      // ==========================================
      // EXPIRING SOON
      // ==========================================

      MedicineBatch.countDocuments({
        isActive: true,
        quantity: {
          $gt: 0,
        },
        expiryDate: {
          $gte: startOfToday,
          $lte: expiryLimit,
        },
      }),


      // ==========================================
      // EXPIRED
      // ==========================================

      MedicineBatch.countDocuments({
        isActive: true,
        quantity: {
          $gt: 0,
        },
        expiryDate: {
          $lt: startOfToday,
        },
      }),


      // ==========================================
      // RECENT SALES
      // ==========================================

      Sale.find({
        status: {
          $ne: "cancelled",
        },
      })
        .populate("patient", "name phone")
        .populate("createdBy", "name email")
        .populate(
          "items.medicine",
          "name"
        )
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .lean(),


      // ==========================================
      // RECENT DISPENSING
      // ==========================================

      Dispensing.find()
        .populate("patient", "name phone")
        .populate("createdBy", "name email")
        .populate("sale", "totalAmount paymentStatus")
        .populate(
          "items.medicine",
          "name"
        )
        .populate(
          "items.batch",
          "batchNumber expiryDate"
        )
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .lean(),
    ]);


    // ==========================================
    // Extract Aggregation Results
    // ==========================================

    const salesToday = todaySales[0] || {
      total: 0,
      count: 0,
    };

    const salesWeek = weekSales[0] || {
      total: 0,
      count: 0,
    };

    const salesMonth = monthSales[0] || {
      total: 0,
      count: 0,
    };

    const paymentsToday = todayPayments[0] || {
      total: 0,
      count: 0,
    };

    const expensesToday = todayExpenses[0] || {
      total: 0,
      count: 0,
    };


    // ==========================================
    // Net Cash
    // ==========================================

    const netCash =
      paymentsToday.total -
      expensesToday.total;


    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json({
      success: true,

      dashboard: {

        // ======================================
        // Financial
        // ======================================

        financial: {
          todaySales: salesToday.total,
          todaySalesCount: salesToday.count,

          todayPayments: paymentsToday.total,
          todayPaymentsCount: paymentsToday.count,

          todayExpenses: expensesToday.total,
          todayExpensesCount: expensesToday.count,

          netCash,
        },


        // ======================================
        // Sales Statistics
        // ======================================

        sales: {
          today: {
            amount: salesToday.total,
            count: salesToday.count,
          },

          week: {
            amount: salesWeek.total,
            count: salesWeek.count,
          },

          month: {
            amount: salesMonth.total,
            count: salesMonth.count,
          },
        },


        // ======================================
        // Cash Drawer
        // ======================================

        cashDrawer: currentCashDrawer
          ? {
              id: currentCashDrawer._id,

              status:
                currentCashDrawer.status,

              openingBalance:
                currentCashDrawer.openingBalance,

              expectedCash:
                currentCashDrawer.expectedCash,

              actualCash:
                currentCashDrawer.actualCash,

              difference:
                currentCashDrawer.difference,

              openedAt:
                currentCashDrawer.openedAt,

              openedBy:
                currentCashDrawer.openedBy,
            }
          : null,


        // ======================================
        // Inventory
        // ======================================

        inventory: {
          totalMedicines,

          lowStock: lowStockBatches,

          expiringSoon: expiringBatches,

          expired: expiredBatches,

          expiryAlertDays: 30,

          lowStockLimit: LOW_STOCK_LIMIT,
        },


        // ======================================
        // Recent Sales
        // ======================================

        recentSales,


        // ======================================
        // Recent Dispensing
        // ======================================

        recentDispensing,
      },
    });

  } catch (error) {

    console.error(
      "Dashboard Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = {
  getDashboard,
};