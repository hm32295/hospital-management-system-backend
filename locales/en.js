const en = {
  common: {
    notAuthorized: "Not authorized",
    tokenMissing: "Token is missing",
    userNotFound: "User not found",
    accountInactive: "User account is inactive",
    invalidOrExpiredToken:
      "Not authorized, invalid or expired token",
    noPermission:
      "You do not have permission to perform this action",
    serverError: "Server error",
  },

  auth: {
    nameEmailPasswordRequired:
      "Name, email and password are required",
    emailPasswordRequired:
      "Email and password are required",
    userAlreadyExists:
      "User already exists",
    registeredSuccessfully:
      "User registered successfully",
    invalidCredentials:
      "Invalid email or password",
    accountInactive:
      "Your account is inactive",
    loginSuccessful:
      "Login successful",
  },
 users: {
    updatedSuccessfully:
      "User updated successfully",

    deactivatedSuccessfully:
      "User deactivated successfully",

    emailAlreadyExists:
      "Email is already in use",

    invalidRole:
      "Invalid user role",

    invalidIsActive:
      "Invalid user status",

    cannotDeactivateSelf:
      "You cannot deactivate your current account",

    nameInvalid:
      "Invalid user name",

    emailInvalid:
      "Invalid email address",
    },
 
 
 medicineCategories: {
  categoriesRequired: "Categories must be a non-empty array",
  categoryNameRequired: "Each category must have a name",
  categoriesAlreadyExist: "Some categories already exist",
  categoryNotFound: "Category not found",
  categoryNameAlreadyExists: "Category name already exists",
  categoryCreatedSuccessfully: "Categories created successfully",
  categoryUpdatedSuccessfully: "Category updated successfully",
  categoryDeactivatedSuccessfully: "Category deactivated successfully",
  invalidIsActive: "Invalid category status",
  invalidName: "Invalid category name",
  invalidDescription: "Invalid category description",
    },
 
 medicines: {
  medicinesRequired: "At least one medicine is required",
  nameCategoryRequired: "Medicine name and category are required",
  categoryNotFound: "Medicine category not found",
  categoryInactive: "Medicine category is inactive",
  medicineAlreadyExists: "Medicine already exists",
  duplicateMedicineInRequest: "Duplicate medicine in request",
  medicineCreatedSuccessfully: "Medicine created successfully",
  medicinesCreatedSuccessfully: "Medicines created successfully",
  medicineNotFound: "Medicine not found",
  medicineUpdatedSuccessfully: "Medicine updated successfully",
  medicineDeactivatedSuccessfully: "Medicine deactivated successfully",
  invalidName: "Invalid medicine name",
  invalidGenericName: "Invalid generic name",
  invalidManufacturer: "Invalid manufacturer",
  invalidDescription: "Invalid medicine description",
  invalidIsActive: "Invalid medicine status",
    },
 medicineBatches: {
  allFieldsRequired: "All batch fields are required",
  medicineNotFound: "Medicine not found",
  medicineInactive: "Medicine is inactive",
  invalidBatchNumber: "Invalid batch number",
  invalidQuantity: "Invalid batch quantity",
  invalidPurchasePrice: "Invalid purchase price",
  invalidSellingPrice: "Invalid selling price",
  invalidExpiryDate: "Invalid expiry date",
  batchAlreadyExists: "This batch already exists for this medicine",
  batchCreatedSuccessfully: "Medicine batch created successfully",
  batchNotFound: "Batch not found",
  batchUpdatedSuccessfully: "Batch updated successfully",
  batchDeactivatedSuccessfully: "Batch deactivated successfully",
  invalidIsActive: "Invalid batch status",
  invalidExpiryStatus: "Invalid expiry status",
  invalidQuantityFilter: "Invalid quantity filter",
  barcodeNotFound: "Barcode not found for this batch",
  barcodeGenerationFailed: "Failed to generate barcode",
  missingBarcodesGeneratedSuccessfully:
    "Missing barcodes generated successfully",
  },
 
 stockTransactions: {
  requiredFields:
    "Batch, type, quantity and reason are required",
  invalidType:
    "Transaction type must be IN or OUT",
  invalidQuantity:
    "Quantity must be greater than zero",
  invalidReason:
    "Transaction reason is required",
  batchNotFound:
    "Medicine batch not found",
  batchInactive:
    "This medicine batch is inactive",
  insufficientStock:
    "Insufficient stock",
  createdSuccessfully:
    "Stock transaction created successfully",
  invalidMedicineId:
    "Invalid medicine ID",
  invalidBatchId:
    "Invalid batch ID",
  transactionNotFound:
    "Stock transaction not found",
  },
 
 suppliers: {
  namePhoneRequired:
    "Supplier name and phone are required",

  invalidName:
    "Invalid supplier name",

  invalidPhone:
    "Invalid supplier phone",

  invalidEmail:
    "Invalid supplier email",

  invalidAddress:
    "Invalid supplier address",

  invalidIsActive:
    "Invalid supplier status",

  alreadyExists:
    "Supplier already exists",

  createdSuccessfully:
    "Supplier created successfully",

  notFound:
    "Supplier not found",

  updatedSuccessfully:
    "Supplier updated successfully",

  deactivatedSuccessfully:
    "Supplier deactivated successfully",
  },
 
  purchases: {
  requiredFields:
    "Supplier, invoice number and items are required",

  invalidInvoiceNumber:
    "Invalid invoice number",

  supplierNotFound:
    "Supplier not found",

  supplierInactive:
    "Supplier is inactive",

  invoiceAlreadyExists:
    "Invoice number already exists",

  invalidItem:
    "Each purchase item must contain medicine, batch number, quantity, expiry date, purchase price and selling price",

  invalidMedicineId:
    "Invalid medicine ID",

  medicineNotFound:
    "Medicine not found",

  medicineInactive:
    "Medicine is inactive",

  invalidQuantity:
    "Quantity must be greater than zero",

  invalidPurchasePrice:
    "Purchase price cannot be negative",

  invalidSellingPrice:
    "Selling price cannot be negative",

  invalidBatchNumber:
    "Invalid batch number",

  invalidExpiryDate:
    "Invalid expiry date",

  invalidSupplierId:
    "Invalid supplier ID",

  invalidStatus:
    "Invalid purchase status",

  createdSuccessfully:
    "Purchase created successfully",

  notFound:
    "Purchase not found",

  updatedSuccessfully:
    "Purchase updated successfully",

  confirmedSuccessfully:
    "Purchase confirmed successfully",

  cancelledSuccessfully:
    "Purchase cancelled successfully",

  alreadyConfirmed:
    "Purchase is already confirmed",

  alreadyCancelled:
    "Purchase is already cancelled",

  confirmedCannotCancel:
    "Confirmed purchase cannot be cancelled",

  cancelledCannotConfirm:
    "Cancelled purchase cannot be confirmed",
  },
  patients: {
  nameRequired:
    "Patient name is required",

  invalidEmail:
    "Invalid patient email",

  invalidGender:
    "Invalid patient gender",

  invalidDateOfBirth:
    "Invalid date of birth",

  invalidIsActive:
    "Invalid patient status",

  nationalIdAlreadyExists:
    "A patient with this national ID already exists",

  phoneAlreadyExists:
    "A patient with this phone number already exists",

  createdSuccessfully:
    "Patient created successfully",

  notFound:
    "Patient not found",

  updatedSuccessfully:
    "Patient updated successfully",

  alreadyDeactivated:
    "Patient is already deactivated",

  deactivatedSuccessfully:
    "Patient deactivated successfully",
  },
  stock: {
  invalidExpiryDays: "Expiry days must be between 1 and 365",
  invalidThreshold: "Stock threshold must be zero or greater",
  invalidTransactionType: "Transaction type must be IN or OUT",
  invalidMedicineId: "Invalid medicine ID",
  invalidUserId: "Invalid user ID",
  invalidFromDate: "Invalid start date",
  invalidToDate: "Invalid end date",
  invalidDateRange: "Start date cannot be later than end date",
  },
  
  prescriptions: {
  consultationItemsRequired: "Consultation and prescription items are required",
  itemsRequired: "Prescription must contain at least one item",
  itemRequiredFields: "Each prescription item must contain medicine, quantity, dosage, frequency and duration",
  invalidMedicineId: "Invalid medicine ID",
  invalidQuantity: "Medicine quantity must be a positive integer",
  medicineNotFound: "Medicine not found",
  medicineInactive: "Medicine is inactive",
  invalidConsultationId: "Invalid consultation ID",
  consultationNotFound: "Consultation not found",
  invalidConsultationData: "Consultation data is invalid",
  visitNotFound: "Visit not found",
  cancelledVisit: "Cannot create prescription for a cancelled visit",
  patientMismatch: "Consultation patient does not match visit patient",
  doctorMismatch: "Consultation doctor does not match visit doctor",
  alreadyExists: "Prescription already exists for this consultation",
  createdSuccessfully: "Prescription created successfully",
  notFound: "Prescription not found",
  notFoundForConsultation: "Prescription not found for this consultation",
  invalidPatientId: "Invalid patient ID",
  invalidStatus: "Invalid prescription status",
  cancelledCannotUpdate: "Cancelled prescription cannot be updated",
  partialCannotUpdate: "Partially dispensed prescription cannot be updated",
  dispensedCannotUpdate: "Dispensed prescription cannot be updated",
  saleExistsCannotUpdate: "Prescription cannot be updated because a sale already exists for it",
  invalidNotes: "Prescription notes must be a string or null",
  updatedSuccessfully: "Prescription updated successfully",
  dispensedCannotCancel: "Dispensed prescription cannot be cancelled",
  alreadyCancelled: "Prescription is already cancelled",
  partialCannotCancel: "Partially dispensed prescription cannot be cancelled",
  saleExistsCannotCancel: "Prescription cannot be cancelled because a sale already exists for it",
  cancelledSuccessfully: "Prescription cancelled successfully",
  cancelledCannotDispense: "Cancelled prescription cannot be dispensed",
  alreadyDispensed: "Prescription is already fully dispensed",
  saleRequired: "Prescription must be converted to a sale before dispensing",
  cancelledSale: "Cancelled sale cannot be dispensed",
  saleNotPaid: "Prescription cannot be dispensed before the sale is fully paid",
  invalidDispensedQuantity: "Invalid dispensed quantity",
  insufficientStock: "Insufficient stock for {{medicine}}. Required: {{required}}, Available: {{available}}",
  noRemainingMedicines: "No medicines remaining to dispense",
  dispensedSuccessfully: "Prescription dispensed successfully",
  },
  
  dispensing: {
  saleReasonRequired: "Sale and dispensing reason are required",
  invalidSaleId: "Invalid sale ID",
  saleNotFound: "Sale not found",
  cancelledSale: "Cannot dispense a cancelled sale",
  incompleteSale: "Cannot dispense an incomplete sale",
  unpaidSale: "Cannot dispense an unpaid sale",
  remainingAmount: "Sale still has a remaining amount",
  saleItemsRequired: "Sale must contain at least one medicine",
  alreadyDispensed: "This sale has already been dispensed",
  invalidPrescriptionId: "Invalid prescription ID",
  prescriptionNotFound: "Prescription linked to sale was not found",
  cancelledPrescription: "Cancelled prescription cannot be dispensed",
  prescriptionAlreadyDispensed: "Prescription is already fully dispensed",
  invalidSaleItem: "Sale item data is invalid",
  invalidMedicineId: "Invalid medicine ID",
  invalidBatchId: "Invalid batch ID",
  batchNotFound: "Medicine batch not found",
  batchMedicineMismatch: "Medicine batch does not belong to the selected medicine",
  batchInactive: "Batch {{batch}} is inactive",
  batchExpired: "Batch {{batch}} has expired",
  insufficientStock: "Insufficient stock for batch {{batch}}. Available: {{available}}, Required: {{required}}",
  createdSuccessfully: "Medicine dispensed successfully",
  notFound: "Dispensing record not found",
  invalidLimit: "Limit must be an integer between 1 and 100",
  },
  
  sales: {
  itemsRequired: "Sale must contain at least one medicine",
  invalidPatientId: "Invalid patient ID",
  invalidPrescriptionId: "Invalid prescription ID",
  invalidDiscount: "Invalid discount",
  invalidNotes: "Sale notes must be a string or null",
  patientNotFound: "Patient not found",
  patientInactive: "Patient is inactive",
  itemRequiredFields: "Medicine, batch and quantity are required for each sale item",
  invalidMedicineId: "Invalid medicine ID",
  invalidBatchId: "Invalid batch ID",
  invalidQuantity: "Quantity must be a positive integer",
  medicineNotFound: "Medicine not found",
  medicineInactive: "Medicine is inactive",
  batchNotFound: "Medicine batch not found",
  batchMedicineMismatch: "Medicine batch does not belong to the selected medicine",
  batchInactive: "Batch {{batch}} is inactive",
  batchExpired: "Batch {{batch}} has expired",
  insufficientStock: "Insufficient stock for {{medicine}}. Available: {{available}}, Required: {{required}}",
  discountGreaterThanSubtotal: "Discount cannot be greater than subtotal",
  createdSuccessfully: "Sale created successfully",
  notFound: "Sale not found",
  invalidPaymentStatus: "Invalid payment status",
  invalidStatus: "Invalid sale status",
  prescriptionNotFound: "Prescription not found",
  cancelledPrescription: "Cancelled prescription cannot be converted to sale",
  dispensedPrescription: "Fully dispensed prescription cannot be converted to sale",
  prescriptionSaleExists: "A sale already exists for this prescription",
  insufficientMedicineStock: "Insufficient stock for {{medicine}}. Required: {{required}}, Available: {{available}}",
  noRemainingMedicines: "No available medicines remaining in prescription",
  createdFromPrescriptionSuccessfully: "Sale created from prescription successfully",
  notFoundForPrescription: "Sale not found for this prescription",
  },
  
  payments: {
  saleRequired: "Sale is required",
  operationRequired: "Operation is required",
  amountRequired: "Payment amount is required",
  invalidAmount: "Payment amount must be greater than zero",
  invalidNotes: "Payment notes must be a string or null",
  invalidSaleId: "Invalid sale ID",
  invalidVisitId: "Invalid visit ID",
  invalidOperationId: "Invalid operation ID",
  invalidPatientId: "Invalid patient ID",
  saleNotFound: "Sale not found",
  visitNotFound: "Visit not found",
  operationNotFound: "Operation not found",
  patientNotFound: "Patient not found",
  cancelledSale: "Cannot pay a cancelled sale",
  cancelledVisit: "Cannot pay a cancelled visit",
  cancelledOperation: "Cannot pay a cancelled operation",
  saleAlreadyPaid: "Sale is already fully paid",
  visitAlreadyPaid: "Visit is already fully paid",
  operationAlreadyPaid: "Operation is already fully paid",
  amountExceedsRemaining: "Payment amount exceeds remaining amount",
  visitAmountMustEqualRemaining: "Payment amount must equal the remaining visit amount",
  noOpenCashDrawer: "No open cash drawer found",
  createdSuccessfully: "Payment created successfully",
  visitCreatedSuccessfully: "Visit payment created successfully",
  operationCreatedSuccessfully: "Operation payment created successfully",
  notFound: "Payment not found",
  invalidType: "Invalid payment type",
  invalidStatus: "Invalid payment status",
  invalidFromDate: "Invalid start date",
  invalidToDate: "Invalid end date",
  invalidDateRange: "Start date cannot be later than end date",
  },
  cashDrawers: {
  invalidId: "Invalid cash drawer ID",
  invalidOpeningBalance: "Opening balance is invalid and cannot be negative",
  invalidActualCash: "Actual cash is invalid and cannot be negative",
  invalidNotes: "Cash drawer notes must be a string",
  invalidStatus: "Invalid cash drawer status",
  invalidPage: "Page must be greater than zero",
  invalidLimit: "Limit must be between 1 and 100",
  alreadyOpen: "There is already an open cash drawer",
  notFoundOpen: "No open cash drawer found",
  openedSuccessfully: "Cash drawer opened successfully",
  notFound: "Cash drawer not found",
  alreadyClosed: "Cash drawer is already closed",
  closedSuccessfully: "Cash drawer closed successfully",
  },
  expenses: {
  requiredFields: "Cash drawer, amount, category and description are required",
  invalidCashDrawerId: "Invalid cash drawer ID",
  invalidAmount: "Expense amount is invalid and must be greater than zero",
  invalidCategory: "Invalid expense category",
  invalidDescription: "Invalid expense description",
  cashOnly: "Only cash expenses are supported",
  invalidNotes: "Expense notes must be a string",
  cashDrawerNotFound: "Cash drawer not found",
  cashDrawerClosed: "Cannot create an expense on a closed cash drawer",
  insufficientCash: "Expense amount is greater than the available cash in the drawer",
  createdSuccessfully: "Expense created successfully",
  invalidPage: "Page must be greater than zero",
  invalidLimit: "Limit must be between 1 and 100",
  invalidStatus: "Invalid expense status",
  invalidPaymentMethod: "Invalid payment method",
  invalidFromDate: "Invalid start date",
  invalidToDate: "Invalid end date",
  invalidDateRange: "Start date cannot be later than end date",
  },
  visits: {
  patientSpecialtyRequired: "Patient and specialty are required",
  invalidId: "Invalid visit ID",
  invalidPatientId: "Invalid patient ID",
  invalidSpecialtyId: "Invalid specialty ID",
  invalidDoctorId: "Invalid doctor ID",
  patientNotFound: "Patient not found or inactive",
  specialtyNotFound: "Specialty not found or inactive",
  doctorNotBelongToSpecialty: "Doctor does not belong to this specialty or is inactive",
  createdSuccessfully: "Visit created successfully",
  notFound: "Visit not found",
  invalidVisitType: "Invalid visit type",
  invalidPaymentStatus: "Invalid payment status",
  invalidStatus: "Invalid visit status",
  invalidStatusTransition: "Cannot change visit status from {{from}} to {{to}}",
  paymentRequired: "Visit payment must be completed before starting consultation",
  doctorRequired: "A doctor must be assigned before starting consultation",
  patientRequired: "A patient is required before starting consultation",
  statusUpdatedSuccessfully: "Visit status updated successfully",
  invalidPage: "Page must be greater than zero",
  invalidLimit: "Limit must be between 1 and 100",
  },
  doctors: {
  nameRequired: "Doctor name is required",
  specialtyRequired: "At least one specialty is required",
  invalidId: "Invalid doctor ID",
  invalidSpecialtyId: "Invalid specialty ID",
  invalidPhone: "Phone must be a string",
  invalidEmail: "Email must be a string",
  invalidIsActive: "Invalid doctor active status",
  invalidSearch: "Search must be a string",
  specialtiesNotFound: "One or more specialties were not found or are inactive",
  alreadyExists: "A doctor already exists with the same name and specialties",
  createdSuccessfully: "Doctor created successfully",
  notFound: "Doctor not found",
  updatedSuccessfully: "Doctor updated successfully",
  deactivatedSuccessfully: "Doctor deactivated successfully",
  invalidPage: "Page must be greater than zero",
  invalidLimit: "Limit must be between 1 and 100",
  },
  specialties: {
  nameRequired: "Specialty name is required",
  invalidName: "Invalid specialty name",
  nameCannotBeEmpty: "Specialty name cannot be empty",
  invalidDescription: "Specialty description must be a string",
  invalidIsActive: "Invalid specialty active status",
  invalidId: "Invalid specialty ID",
  invalidSearch: "Search must be a string",
  alreadyExists: "Specialty already exists",
  createdSuccessfully: "Specialty created successfully",
  notFound: "Specialty not found",
  updatedSuccessfully: "Specialty updated successfully",
  alreadyInactive: "Specialty is already inactive",
  deactivatedSuccessfully: "Specialty deactivated successfully",
  invalidPage: "Page must be greater than zero",
  invalidLimit: "Limit must be between 1 and 100",
  },
  dashboard: {
  invalidMonth: "Month must be in YYYY-MM format",
  fetchFailed: "Failed to load dashboard",
  },
  doctorSettlements: {
  doctorAndAmountRequired: "Doctor and amount are required",
  invalidDoctorId: "Invalid doctor ID",
  invalidOperationId: "Invalid operation ID",
  invalidId: "Invalid settlement ID",
  invalidAmount: "Amount must be greater than zero",
  invalidNotes: "Settlement notes must be a string",
  invalidPage: "Page must be greater than zero",
  invalidLimit: "Limit must be between 1 and 100",
  doctorNotFound: "Doctor not found",
  doctorInactive: "Doctor is inactive",
  operationNotFound: "Operation not found",
  operationDoctorMismatch: "This operation does not belong to this doctor",
  cancelledOperation: "Cancelled operation cannot be settled",
  operationHasNoDoctorFee: "This operation has no doctor fee",
  exceedsDoctorDue: "Settlement amount exceeds doctor due",
  exceedsOperationDue: "Settlement amount exceeds the doctor fee due for this operation",
  noOpenCashDrawer: "No open cash drawer",
  insufficientCash: "Insufficient cash in the cash drawer",
  createdSuccessfully: "Doctor settlement created successfully",
  createFailed: "Failed to create doctor settlement",
  notFound: "Doctor settlement not found",
  fetchFailed: "Failed to fetch doctor settlements",
  },
  cashTransactions: {
  invalidId: "Invalid cash transaction ID",
  invalidCashDrawerId: "Invalid cash drawer ID",
  invalidDoctorId: "Invalid doctor ID",
  invalidOperationId: "Invalid operation ID",
  invalidVisitId: "Invalid visit ID",
  invalidPatientId: "Invalid patient ID",
  invalidSaleId: "Invalid sale ID",
  invalidPaymentId: "Invalid payment ID",
  invalidType: "Invalid cash transaction type",
  invalidSource: "Invalid cash transaction source",
  invalidFromDate: "Invalid start date",
  invalidToDate: "Invalid end date",
  invalidDateRange: "Invalid date range",
  invalidPage: "Page must be greater than zero",
  invalidLimit: "Limit must be between 1 and 100",
  notFound: "Cash transaction not found",
  fetchFailed: "Failed to fetch cash transactions",
  summaryFailed: "Failed to fetch cash transaction summary",
  },
  operations: {
  requiredFields: "Patient, doctor, specialty, operation name and cost are required",
  invalidId: "Invalid operation ID",
  invalidPatientId: "Invalid patient ID",
  invalidDoctorId: "Invalid doctor ID",
  invalidSpecialtyId: "Invalid specialty ID",
  invalidOperationName: "Invalid operation name",
  invalidOperationDate: "Invalid operation date",
  invalidNotes: "Operation notes must be a string",
  invalidCost: "Cost must be a valid non-negative number",
  invalidDiscount: "Discount must be a valid non-negative number",
  discountGreaterThanCost: "Discount cannot be greater than cost",
  invalidDoctorFeeType: "Invalid doctor fee type",
  invalidDoctorFeeValue: "Doctor fee value must be a valid non-negative number",
  doctorFeePercentageExceeded: "Doctor fee percentage cannot exceed 100%",
  doctorFeeGreaterThanTotal: "Doctor fee cannot be greater than operation amount",
  patientNotFound: "Patient not found",
  doctorNotFound: "Doctor not found",
  doctorInactive: "Doctor is inactive",
  specialtyNotFound: "Specialty not found",
  specialtyInactive: "Specialty is inactive",
  doctorSpecialtyMismatch: "Doctor specialty does not match operation specialty",
  createdSuccessfully: "Operation created successfully",
  fetchFailed: "Failed to fetch operations",
  notFound: "Operation not found",
  invalidPage: "Page must be greater than zero",
  invalidLimit: "Limit must be between 1 and 100",
  invalidSearch: "Search must be a string",
  invalidStatus: "Invalid operation status",
  invalidPaymentStatus: "Invalid payment status",
  cancelledCannotComplete: "Cancelled operation cannot be completed",
  alreadyCompleted: "Operation is already completed",
  completedSuccessfully: "Operation completed successfully",
  completeFailed: "Failed to complete operation",
  cancelledCannotUpdate: "Cancelled operation cannot be updated",
  financialDataLocked: "Operation financial data cannot be changed after doctor settlement",
  totalLessThanPaid: "Operation total cannot be less than the amount already paid",
  hasPaymentsCannotCancel: "Operation with payments cannot be cancelled",
  completedCannotReturnPending: "A completed operation cannot be returned to pending",
  updatedSuccessfully: "Operation updated successfully",
  updateFailed: "Failed to update operation",
  alreadyCancelled: "Operation is already cancelled",
  cancelledSuccessfully: "Operation cancelled successfully",
  cancelFailed: "Failed to cancel operation",
  createFailed: "Failed to create operation",
  },
  consultations: {
  visitRequired: "Visit is required",
  invalidId: "Invalid consultation ID",
  invalidVisitId: "Invalid visit ID",
  invalidMedicineId: "Invalid medicine ID",
  textFieldsMustBeString: "Consultation text fields must be strings",
  visitNotFound: "Visit not found",
  cancelledVisit: "Cannot create or complete a consultation for a cancelled visit",
  visitMustBeInConsultation: "Visit must be in consultation status",
  visitDoctorRequired: "Visit must have an assigned doctor",
  alreadyExists: "Consultation already exists for this visit",
  createdSuccessfully: "Consultation created successfully",
  createFailed: "Failed to create consultation",
  notFound: "Consultation not found",
  fetchFailed: "Failed to fetch consultation",
  cancelledVisitCannotUpdate: "Cancelled visit consultation cannot be updated",
  completedCannotUpdate: "Completed consultation cannot be updated",
  updatedSuccessfully: "Consultation updated successfully",
  updateFailed: "Failed to update consultation",
  itemsMustBeArray: "Prescription items must be an array",
  invalidPrescriptionItem: "Each prescription item must contain medicine, quantity, dosage, frequency and duration",
  invalidMedicineQuantity: "Medicine quantity must be a positive integer",
  invalidPrescriptionInstructions: "Prescription instructions must be a string",
  medicineNotFound: "One or more medicines were not found",
  cancelledPrescription: "Cancelled prescription cannot be updated",
  dispensedPrescription: "Dispensed prescription cannot be updated",
  patientMismatch: "Consultation patient does not match visit patient",
  doctorMismatch: "Consultation doctor does not match visit doctor",
  visitAlreadyCompleted: "Visit is already completed",
  completedWithPrescription: "Consultation and prescription completed successfully",
  completedSuccessfully: "Consultation completed successfully",
  completeFailed: "Failed to complete consultation",
},
  system: {
    running:
      "Hospital Management System API is running",
  },
};

module.exports = en;