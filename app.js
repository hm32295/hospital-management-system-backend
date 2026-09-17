const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes");
const medicineCategoryRouter = require("./routes/medicineCategoryRoutes");
const medicineRouter = require("./routes/medicineRoutes");
const medicineBatchRouter = require("./routes/medicineBatch.routes");
const stockTransactionRouter = require("./routes/stockTransaction.routes");
const supplierRouter = require("./routes/supplier.routes");
const purchaseRouter = require("./routes/purchase.routes");
const dispensingRouter = require("./routes/dispensing.routes");
const prescriptionRouter = require("./routes/prescription.routes");
const stockRouter = require("./routes/stock.routes");
const patientRouter = require("./routes/patient.routes");
const saleRouter = require("./routes/sale.router");
const paymentRouter = require("./routes/paymentRouter");
const cashDrawerRouter = require("./routes/cashDrawerRouter");
const expenseRouter = require("./routes/expenseRouter");
const dashboardRouter = require("./routes/dashboardRouter");
const specialtyRouter = require("./routes/specialtyRouter");
const doctorRouter = require("./routes/doctorRouter");
const visitRouter = require("./routes/visitRouter");
const consultationRouter = require("./routes/consultationRouter");
const operationTypeRouter = require("./routes/operationType.routes");
const operationRouter = require("./routes/operation.routes");
const operationPaymentRouter = require("./routes/operationPayment.routes");
const cashTransactionRouter = require("./routes/cashTransaction.routes");
const doctorSettlementRouter = require("./routes/doctorSettlement.router");

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    message: "Hospital Management System API is running",
  });
});

 
app.use("/api/auth", authRouter); 
app.use("/api/users", userRouter); 
app.use("/api/medicine-categories", medicineCategoryRouter); 
app.use("/api/medicines", medicineRouter);  
app.use("/api/medicine-batches", medicineBatchRouter);  
app.use("/api/stock-transactions", stockTransactionRouter); 
app.use("/api/suppliers", supplierRouter);
app.use("/api/purchases", purchaseRouter); 
app.use("/api/patients", patientRouter); 
app.use("/api/stock", stockRouter); 
app.use("/api/prescriptions", prescriptionRouter);



app.use("/api/dispensing", dispensingRouter); 
app.use("/api/sales", saleRouter);
app.use("/api/payments", paymentRouter); 
app.use("/api/cash-drawers", cashDrawerRouter);
app.use("/api/expenses", expenseRouter)
app.use("/api/dashboard", dashboardRouter)


app.use("/api/specialties", specialtyRouter);
app.use("/api/doctors", doctorRouter);
app.use("/api/visits", visitRouter);
app.use("/api/consultations", consultationRouter);

app.use("/api/operations", operationRouter);
app.use("/api/operation-payments", operationPaymentRouter);
app.use("/api/cash-transactions", cashTransactionRouter);

app.use("/api/doctor-settlements",doctorSettlementRouter);
module.exports = app;
 