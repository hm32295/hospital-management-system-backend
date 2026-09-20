const ar = {
  common: {
    notAuthorized: "غير مصرح لك",
    tokenMissing: "رمز الدخول غير موجود",
    userNotFound: "المستخدم غير موجود",
    accountInactive: "حساب المستخدم غير نشط",
    invalidOrExpiredToken:
      "رمز الدخول غير صالح أو منتهي الصلاحية",
    noPermission:
      "ليس لديك صلاحية لتنفيذ هذا الإجراء",
    serverError: "حدث خطأ في الخادم",
  },

  auth: {
    nameEmailPasswordRequired:
      "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة",
    emailPasswordRequired:
      "البريد الإلكتروني وكلمة المرور مطلوبة",
    userAlreadyExists:
      "المستخدم موجود بالفعل",
    registeredSuccessfully:
      "تم تسجيل المستخدم بنجاح",
    invalidCredentials:
      "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    accountInactive:
      "حسابك غير نشط",
    loginSuccessful:
      "تم تسجيل الدخول بنجاح",
  },
 users: {
    updatedSuccessfully:
      "تم تحديث المستخدم بنجاح",

    deactivatedSuccessfully:
      "تم تعطيل المستخدم بنجاح",

    emailAlreadyExists:
      "البريد الإلكتروني مستخدم بالفعل",

    invalidRole:
      "الدور المحدد غير صالح",

    invalidIsActive:
      "حالة المستخدم غير صالحة",

    cannotDeactivateSelf:
      "لا يمكنك تعطيل حسابك الحالي",

    nameInvalid:
      "اسم المستخدم غير صالح",

    emailInvalid:
      "البريد الإلكتروني غير صالح",
    },
 
medicineCategories: {
  categoriesRequired: "يجب إرسال قائمة غير فارغة من التصنيفات",
  categoryNameRequired: "يجب أن يحتوي كل تصنيف على اسم",
  categoriesAlreadyExist: "بعض التصنيفات موجودة بالفعل",
  categoryNotFound: "التصنيف غير موجود",
  categoryNameAlreadyExists: "اسم التصنيف مستخدم بالفعل",
  categoryCreatedSuccessfully: "تم إنشاء التصنيفات بنجاح",
  categoryUpdatedSuccessfully: "تم تحديث التصنيف بنجاح",
  categoryDeactivatedSuccessfully: "تم تعطيل التصنيف بنجاح",
  invalidIsActive: "حالة التصنيف غير صالحة",
  invalidName: "اسم التصنيف غير صالح",
  invalidDescription: "وصف التصنيف غير صالح",
    },
medicines: {
  medicinesRequired: "يجب إضافة دواء واحد على الأقل",
  nameCategoryRequired: "اسم الدواء والتصنيف مطلوبان",
  categoryNotFound: "تصنيف الدواء غير موجود",
  categoryInactive: "تصنيف الدواء غير نشط",
  medicineAlreadyExists: "الدواء موجود بالفعل",
  duplicateMedicineInRequest: "يوجد دواء مكرر داخل الطلب",
  medicineCreatedSuccessfully: "تم إنشاء الدواء بنجاح",
  medicinesCreatedSuccessfully: "تم إنشاء الأدوية بنجاح",
  medicineNotFound: "الدواء غير موجود",
  medicineUpdatedSuccessfully: "تم تحديث الدواء بنجاح",
  medicineDeactivatedSuccessfully: "تم تعطيل الدواء بنجاح",
  invalidName: "اسم الدواء غير صالح",
  invalidGenericName: "الاسم العلمي غير صالح",
  invalidManufacturer: "اسم الشركة المصنعة غير صالح",
  invalidDescription: "وصف الدواء غير صالح",
  invalidIsActive: "حالة الدواء غير صالحة",
    },

    medicineBatches: {
  allFieldsRequired: "جميع بيانات التشغيلة مطلوبة",
  medicineNotFound: "الدواء غير موجود",
  medicineInactive: "الدواء غير نشط",
  invalidBatchNumber: "رقم التشغيلة غير صالح",
  invalidQuantity: "كمية التشغيلة غير صالحة",
  invalidPurchasePrice: "سعر الشراء غير صالح",
  invalidSellingPrice: "سعر البيع غير صالح",
  invalidExpiryDate: "تاريخ انتهاء الصلاحية غير صالح",
  batchAlreadyExists:
    "هذه التشغيلة موجودة بالفعل لهذا الدواء",
  batchCreatedSuccessfully:
    "تم إنشاء تشغيلة الدواء بنجاح",
  batchNotFound: "التشغيلة غير موجودة",
  batchUpdatedSuccessfully:
    "تم تحديث التشغيلة بنجاح",
  batchDeactivatedSuccessfully:
    "تم تعطيل التشغيلة بنجاح",
  invalidIsActive: "حالة التشغيلة غير صالحة",
  invalidExpiryStatus: "حالة انتهاء الصلاحية غير صالحة",
  invalidQuantityFilter: "فلتر الكمية غير صالح",
  barcodeNotFound:
    "الباركود غير موجود لهذه التشغيلة",
  barcodeGenerationFailed:
    "فشل في إنشاء الباركود",
  missingBarcodesGeneratedSuccessfully:
    "تم إنشاء الباركودات المفقودة بنجاح",
  },
    
    stockTransactions: {
  requiredFields:
    "التشغيلة ونوع الحركة والكمية والسبب مطلوبة",
  invalidType:
    "نوع الحركة يجب أن يكون IN أو OUT",
  invalidQuantity:
    "يجب أن تكون الكمية أكبر من صفر",
  invalidReason:
    "سبب حركة المخزون مطلوب",
  batchNotFound:
    "تشغيلة الدواء غير موجودة",
  batchInactive:
    "تشغيلة الدواء غير نشطة",
  insufficientStock:
    "الكمية المتاحة في المخزون غير كافية",
  createdSuccessfully:
    "تم إنشاء حركة المخزون بنجاح",
  invalidMedicineId:
    "معرف الدواء غير صالح",
  invalidBatchId:
    "معرف التشغيلة غير صالح",
  transactionNotFound:
    "حركة المخزون غير موجودة",
  },
    suppliers: {
  namePhoneRequired:
    "اسم المورد ورقم الهاتف مطلوبان",

  invalidName:
    "اسم المورد غير صالح",

  invalidPhone:
    "رقم هاتف المورد غير صالح",

  invalidEmail:
    "البريد الإلكتروني للمورد غير صالح",

  invalidAddress:
    "عنوان المورد غير صالح",

  invalidIsActive:
    "حالة المورد غير صالحة",

  alreadyExists:
    "المورد موجود بالفعل",

  createdSuccessfully:
    "تم إنشاء المورد بنجاح",

  notFound:
    "المورد غير موجود",

  updatedSuccessfully:
    "تم تحديث المورد بنجاح",

  deactivatedSuccessfully:
    "تم تعطيل المورد بنجاح",
  },
    
    purchases: {
  requiredFields:
    "المورد ورقم الفاتورة والأدوية مطلوبة",

  invalidInvoiceNumber:
    "رقم الفاتورة غير صالح",

  supplierNotFound:
    "المورد غير موجود",

  supplierInactive:
    "المورد غير نشط",

  invoiceAlreadyExists:
    "رقم الفاتورة مستخدم بالفعل",

  invalidItem:
    "كل صنف في المشتريات يجب أن يحتوي على الدواء ورقم التشغيلة والكمية وتاريخ الانتهاء وسعر الشراء وسعر البيع",

  invalidMedicineId:
    "معرف الدواء غير صالح",

  medicineNotFound:
    "الدواء غير موجود",

  medicineInactive:
    "الدواء غير نشط",

  invalidQuantity:
    "يجب أن تكون الكمية أكبر من صفر",

  invalidPurchasePrice:
    "سعر الشراء لا يمكن أن يكون سالبًا",

  invalidSellingPrice:
    "سعر البيع لا يمكن أن يكون سالبًا",

  invalidBatchNumber:
    "رقم التشغيلة غير صالح",

  invalidExpiryDate:
    "تاريخ الانتهاء غير صالح",

  invalidSupplierId:
    "معرف المورد غير صالح",

  invalidStatus:
    "حالة المشتريات غير صالحة",

  createdSuccessfully:
    "تم إنشاء عملية الشراء بنجاح",

  notFound:
    "عملية الشراء غير موجودة",

  updatedSuccessfully:
    "تم تحديث عملية الشراء بنجاح",

  confirmedSuccessfully:
    "تم تأكيد عملية الشراء بنجاح",

  cancelledSuccessfully:
    "تم إلغاء عملية الشراء بنجاح",

  alreadyConfirmed:
    "عملية الشراء مؤكدة بالفعل",

  alreadyCancelled:
    "عملية الشراء ملغاة بالفعل",

  confirmedCannotCancel:
    "لا يمكن إلغاء عملية شراء مؤكدة",

  cancelledCannotConfirm:
    "لا يمكن تأكيد عملية شراء ملغاة",
  },
    
  patients: {
  nameRequired:
    "اسم المريض مطلوب",

  invalidEmail:
    "البريد الإلكتروني للمريض غير صالح",

  invalidGender:
    "نوع المريض غير صالح",

  invalidDateOfBirth:
    "تاريخ الميلاد غير صالح",

  invalidIsActive:
    "حالة المريض غير صالحة",

  nationalIdAlreadyExists:
    "يوجد مريض مسجل بهذا الرقم القومي بالفعل",

  phoneAlreadyExists:
    "يوجد مريض مسجل برقم الهاتف هذا بالفعل",

  createdSuccessfully:
    "تم إنشاء المريض بنجاح",

  notFound:
    "المريض غير موجود",

  updatedSuccessfully:
    "تم تحديث بيانات المريض بنجاح",

  alreadyDeactivated:
    "المريض متوقف بالفعل",

  deactivatedSuccessfully:
    "تم تعطيل المريض بنجاح",
  },
  stock: {
  invalidExpiryDays: "عدد أيام انتهاء الصلاحية يجب أن يكون بين 1 و365",
  invalidThreshold: "حد المخزون يجب أن يكون صفرًا أو أكبر",
  invalidTransactionType: "نوع حركة المخزون يجب أن يكون IN أو OUT",
  invalidMedicineId: "معرف الدواء غير صالح",
  invalidUserId: "معرف المستخدم غير صالح",
  invalidFromDate: "تاريخ البداية غير صالح",
  invalidToDate: "تاريخ النهاية غير صالح",
  invalidDateRange: "لا يمكن أن يكون تاريخ البداية بعد تاريخ النهاية",
  },
  
  prescriptions: {
  consultationItemsRequired: "الاستشارة وأدوية الروشتة مطلوبة",
  itemsRequired: "يجب أن تحتوي الروشتة على دواء واحد على الأقل",
  itemRequiredFields: "كل دواء يجب أن يحتوي على الدواء والكمية والجرعة والتكرار والمدة",
  invalidMedicineId: "معرف الدواء غير صالح",
  invalidQuantity: "كمية الدواء يجب أن تكون رقمًا صحيحًا أكبر من صفر",
  medicineNotFound: "الدواء غير موجود",
  medicineInactive: "الدواء غير نشط",
  invalidConsultationId: "معرف الاستشارة غير صالح",
  consultationNotFound: "الاستشارة غير موجودة",
  invalidConsultationData: "بيانات الاستشارة غير صالحة",
  visitNotFound: "الزيارة غير موجودة",
  cancelledVisit: "لا يمكن إنشاء روشتة لزيارة ملغاة",
  patientMismatch: "مريض الاستشارة لا يتطابق مع مريض الزيارة",
  doctorMismatch: "طبيب الاستشارة لا يتطابق مع طبيب الزيارة",
  alreadyExists: "توجد روشتة بالفعل لهذه الاستشارة",
  createdSuccessfully: "تم إنشاء الروشتة بنجاح",
  notFound: "الروشتة غير موجودة",
  notFoundForConsultation: "لا توجد روشتة لهذه الاستشارة",
  invalidPatientId: "معرف المريض غير صالح",
  invalidStatus: "حالة الروشتة غير صالحة",
  cancelledCannotUpdate: "لا يمكن تعديل روشتة ملغاة",
  partialCannotUpdate: "لا يمكن تعديل روشتة تم صرف جزء منها",
  dispensedCannotUpdate: "لا يمكن تعديل روشتة تم صرفها بالكامل",
  saleExistsCannotUpdate: "لا يمكن تعديل الروشتة لوجود فاتورة بيع مرتبطة بها",
  invalidNotes: "ملاحظات الروشتة يجب أن تكون نصًا أو null",
  updatedSuccessfully: "تم تحديث الروشتة بنجاح",
  dispensedCannotCancel: "لا يمكن إلغاء روشتة تم صرفها بالكامل",
  alreadyCancelled: "الروشتة ملغاة بالفعل",
  partialCannotCancel: "لا يمكن إلغاء روشتة تم صرف جزء منها",
  saleExistsCannotCancel: "لا يمكن إلغاء الروشتة لوجود فاتورة بيع مرتبطة بها",
  cancelledSuccessfully: "تم إلغاء الروشتة بنجاح",
  cancelledCannotDispense: "لا يمكن صرف روشتة ملغاة",
  alreadyDispensed: "تم صرف الروشتة بالكامل بالفعل",
  saleRequired: "يجب تحويل الروشتة إلى فاتورة بيع قبل صرفها",
  cancelledSale: "لا يمكن صرف فاتورة بيع ملغاة",
  saleNotPaid: "لا يمكن صرف الروشتة قبل دفع الفاتورة بالكامل",
  invalidDispensedQuantity: "الكمية المصروفة غير صالحة",
  insufficientStock: "المخزون غير كافٍ للدواء {{medicine}}. المطلوب: {{required}}، المتاح: {{available}}",
  noRemainingMedicines: "لا توجد أدوية متبقية للصرف",
  dispensedSuccessfully: "تم صرف الروشتة بنجاح",
  },
  dispensing: {
  saleReasonRequired: "الفاتورة وسبب الصرف مطلوبان",
  invalidSaleId: "معرف الفاتورة غير صالح",
  saleNotFound: "الفاتورة غير موجودة",
  cancelledSale: "لا يمكن صرف فاتورة ملغاة",
  incompleteSale: "لا يمكن صرف فاتورة غير مكتملة",
  unpaidSale: "لا يمكن صرف فاتورة غير مدفوعة",
  remainingAmount: "لا يزال هناك مبلغ متبقٍ على الفاتورة",
  saleItemsRequired: "يجب أن تحتوي الفاتورة على دواء واحد على الأقل",
  alreadyDispensed: "تم صرف هذه الفاتورة بالفعل",
  invalidPrescriptionId: "معرف الروشتة غير صالح",
  prescriptionNotFound: "الروشتة المرتبطة بالفاتورة غير موجودة",
  cancelledPrescription: "لا يمكن صرف روشتة ملغاة",
  prescriptionAlreadyDispensed: "تم صرف الروشتة بالكامل بالفعل",
  invalidSaleItem: "بيانات دواء الفاتورة غير صالحة",
  invalidMedicineId: "معرف الدواء غير صالح",
  invalidBatchId: "معرف التشغيلة غير صالح",
  batchNotFound: "تشغيلة الدواء غير موجودة",
  batchMedicineMismatch: "تشغيلة الدواء لا تخص الدواء المحدد",
  batchInactive: "التشغيلة {{batch}} غير نشطة",
  batchExpired: "التشغيلة {{batch}} منتهية الصلاحية",
  insufficientStock: "المخزون غير كافٍ للتشغيلة {{batch}}. المتاح: {{available}}، المطلوب: {{required}}",
  createdSuccessfully: "تم صرف الدواء بنجاح",
  notFound: "سجل الصرف غير موجود",
  invalidLimit: "الحد يجب أن يكون رقمًا صحيحًا بين 1 و100",
  },
  
  sales: {
  itemsRequired: "يجب أن تحتوي الفاتورة على دواء واحد على الأقل",
  invalidPatientId: "معرف المريض غير صالح",
  invalidPrescriptionId: "معرف الروشتة غير صالح",
  invalidDiscount: "الخصم غير صالح",
  invalidNotes: "ملاحظات الفاتورة يجب أن تكون نصًا أو null",
  patientNotFound: "المريض غير موجود",
  patientInactive: "المريض غير نشط",
  itemRequiredFields: "الدواء والتشغيلة والكمية مطلوبة لكل صنف في الفاتورة",
  invalidMedicineId: "معرف الدواء غير صالح",
  invalidBatchId: "معرف التشغيلة غير صالح",
  invalidQuantity: "الكمية يجب أن تكون رقمًا صحيحًا أكبر من صفر",
  medicineNotFound: "الدواء غير موجود",
  medicineInactive: "الدواء غير نشط",
  batchNotFound: "تشغيلة الدواء غير موجودة",
  batchMedicineMismatch: "تشغيلة الدواء لا تخص الدواء المحدد",
  batchInactive: "التشغيلة {{batch}} غير نشطة",
  batchExpired: "التشغيلة {{batch}} منتهية الصلاحية",
  insufficientStock: "المخزون غير كافٍ للدواء {{medicine}}. المتاح: {{available}}، المطلوب: {{required}}",
  discountGreaterThanSubtotal: "لا يمكن أن يكون الخصم أكبر من الإجمالي الفرعي",
  createdSuccessfully: "تم إنشاء الفاتورة بنجاح",
  notFound: "الفاتورة غير موجودة",
  invalidPaymentStatus: "حالة الدفع غير صالحة",
  invalidStatus: "حالة الفاتورة غير صالحة",
  prescriptionNotFound: "الروشتة غير موجودة",
  cancelledPrescription: "لا يمكن تحويل روشتة ملغاة إلى فاتورة",
  dispensedPrescription: "لا يمكن تحويل روشتة تم صرفها بالكامل إلى فاتورة",
  prescriptionSaleExists: "توجد فاتورة بالفعل لهذه الروشتة",
  insufficientMedicineStock: "المخزون غير كافٍ للدواء {{medicine}}. المطلوب: {{required}}، المتاح: {{available}}",
  noRemainingMedicines: "لا توجد أدوية متبقية متاحة في الروشتة",
  createdFromPrescriptionSuccessfully: "تم إنشاء الفاتورة من الروشتة بنجاح",
  notFoundForPrescription: "لا توجد فاتورة لهذه الروشتة",
  },
  payments: {
  saleRequired: "الفاتورة مطلوبة",
  operationRequired: "العملية مطلوبة",
  amountRequired: "مبلغ الدفع مطلوب",
  invalidAmount: "يجب أن يكون مبلغ الدفع أكبر من صفر",
  invalidNotes: "ملاحظات الدفع يجب أن تكون نصًا أو null",
  invalidSaleId: "معرف الفاتورة غير صالح",
  invalidVisitId: "معرف الزيارة غير صالح",
  invalidOperationId: "معرف العملية غير صالح",
  invalidPatientId: "معرف المريض غير صالح",
  saleNotFound: "الفاتورة غير موجودة",
  visitNotFound: "الزيارة غير موجودة",
  operationNotFound: "العملية غير موجودة",
  patientNotFound: "المريض غير موجود",
  cancelledSale: "لا يمكن دفع فاتورة ملغاة",
  cancelledVisit: "لا يمكن دفع زيارة ملغاة",
  cancelledOperation: "لا يمكن دفع عملية ملغاة",
  saleAlreadyPaid: "الفاتورة مدفوعة بالكامل بالفعل",
  visitAlreadyPaid: "الزيارة مدفوعة بالكامل بالفعل",
  operationAlreadyPaid: "العملية مدفوعة بالكامل بالفعل",
  amountExceedsRemaining: "مبلغ الدفع أكبر من المبلغ المتبقي",
  visitAmountMustEqualRemaining: "يجب أن يساوي مبلغ الدفع المبلغ المتبقي للزيارة",
  noOpenCashDrawer: "لا يوجد درج نقدية مفتوح",
  createdSuccessfully: "تم إنشاء الدفع بنجاح",
  visitCreatedSuccessfully: "تم إنشاء دفع الزيارة بنجاح",
  operationCreatedSuccessfully: "تم إنشاء دفع العملية بنجاح",
  notFound: "الدفع غير موجود",
  invalidType: "نوع الدفع غير صالح",
  invalidStatus: "حالة الدفع غير صالحة",
  invalidFromDate: "تاريخ البداية غير صالح",
  invalidToDate: "تاريخ النهاية غير صالح",
  invalidDateRange: "لا يمكن أن يكون تاريخ البداية بعد تاريخ النهاية",
  },
  cashDrawers: {
  invalidId: "معرف الخزنة غير صالح",
  invalidOpeningBalance: "الرصيد الافتتاحي غير صالح ويجب ألا يكون سالبًا",
  invalidActualCash: "الرصيد الفعلي غير صالح ويجب ألا يكون سالبًا",
  invalidNotes: "ملاحظات الخزنة يجب أن تكون نصًا",
  invalidStatus: "حالة الخزنة غير صالحة",
  invalidPage: "رقم الصفحة يجب أن يكون أكبر من صفر",
  invalidLimit: "الحد يجب أن يكون بين 1 و100",
  alreadyOpen: "توجد خزنة نقدية مفتوحة بالفعل",
  notFoundOpen: "لا توجد خزنة نقدية مفتوحة",
  openedSuccessfully: "تم فتح الخزنة النقدية بنجاح",
  notFound: "الخزنة النقدية غير موجودة",
  alreadyClosed: "الخزنة النقدية مغلقة بالفعل",
  closedSuccessfully: "تم إغلاق الخزنة النقدية بنجاح",
  },
  
  expenses: {
  requiredFields: "الخزنة والمبلغ والتصنيف والوصف مطلوبة",
  invalidCashDrawerId: "معرف الخزنة غير صالح",
  invalidAmount: "مبلغ المصروف غير صالح ويجب أن يكون أكبر من صفر",
  invalidCategory: "تصنيف المصروف غير صالح",
  invalidDescription: "وصف المصروف غير صالح",
  cashOnly: "المصروفات النقدية فقط مدعومة حاليًا",
  invalidNotes: "ملاحظات المصروف يجب أن تكون نصًا",
  cashDrawerNotFound: "الخزنة النقدية غير موجودة",
  cashDrawerClosed: "لا يمكن تسجيل مصروف على خزنة مغلقة",
  insufficientCash: "المبلغ المطلوب للمصروف أكبر من النقد المتاح في الخزنة",
  createdSuccessfully: "تم إنشاء المصروف بنجاح",
  invalidPage: "رقم الصفحة يجب أن يكون أكبر من صفر",
  invalidLimit: "الحد يجب أن يكون بين 1 و100",
  invalidStatus: "حالة المصروف غير صالحة",
  invalidPaymentMethod: "طريقة الدفع غير صالحة",
  invalidFromDate: "تاريخ البداية غير صالح",
  invalidToDate: "تاريخ النهاية غير صالح",
  invalidDateRange: "لا يمكن أن يكون تاريخ البداية بعد تاريخ النهاية",
  },
  visits: {
  patientSpecialtyRequired: "المريض والتخصص مطلوبان",
  invalidId: "معرف الزيارة غير صالح",
  invalidPatientId: "معرف المريض غير صالح",
  invalidSpecialtyId: "معرف التخصص غير صالح",
  invalidDoctorId: "معرف الطبيب غير صالح",
  patientNotFound: "المريض غير موجود أو غير نشط",
  specialtyNotFound: "التخصص غير موجود أو غير نشط",
  doctorNotBelongToSpecialty: "الطبيب لا ينتمي إلى هذا التخصص أو غير نشط",
  createdSuccessfully: "تم إنشاء الزيارة بنجاح",
  notFound: "الزيارة غير موجودة",
  invalidVisitType: "نوع الزيارة غير صالح",
  invalidPaymentStatus: "حالة الدفع غير صالحة",
  invalidStatus: "حالة الزيارة غير صالحة",
  invalidStatusTransition: "لا يمكن تغيير حالة الزيارة من {{from}} إلى {{to}}",
  paymentRequired: "يجب إكمال دفع الزيارة قبل بدء الكشف",
  doctorRequired: "يجب تعيين طبيب قبل بدء الكشف",
  patientRequired: "يجب وجود مريض قبل بدء الكشف",
  statusUpdatedSuccessfully: "تم تحديث حالة الزيارة بنجاح",
  invalidPage: "رقم الصفحة يجب أن يكون أكبر من صفر",
  invalidLimit: "الحد يجب أن يكون بين 1 و100",
  },
  doctors: {
  nameRequired: "اسم الطبيب مطلوب",
  specialtyRequired: "يجب إضافة تخصص واحد على الأقل للطبيب",
  invalidId: "معرف الطبيب غير صالح",
  invalidSpecialtyId: "معرف التخصص غير صالح",
  invalidPhone: "رقم الهاتف يجب أن يكون نصًا",
  invalidEmail: "البريد الإلكتروني يجب أن يكون نصًا",
  invalidIsActive: "حالة الطبيب غير صالحة",
  invalidSearch: "البحث يجب أن يكون نصًا",
  specialtiesNotFound: "تخصص واحد أو أكثر غير موجود أو غير نشط",
  alreadyExists: "يوجد طبيب بالفعل بنفس الاسم وهذه التخصصات",
  createdSuccessfully: "تم إنشاء الطبيب بنجاح",
  notFound: "الطبيب غير موجود",
  updatedSuccessfully: "تم تحديث الطبيب بنجاح",
  deactivatedSuccessfully: "تم تعطيل الطبيب بنجاح",
  invalidPage: "رقم الصفحة يجب أن يكون أكبر من صفر",
  invalidLimit: "الحد يجب أن يكون بين 1 و100",
  },
  specialties: {
  nameRequired: "اسم التخصص مطلوب",
  invalidName: "اسم التخصص غير صالح",
  nameCannotBeEmpty: "اسم التخصص لا يمكن أن يكون فارغًا",
  invalidDescription: "وصف التخصص يجب أن يكون نصًا",
  invalidIsActive: "حالة التخصص غير صالحة",
  invalidId: "معرف التخصص غير صالح",
  invalidSearch: "البحث يجب أن يكون نصًا",
  alreadyExists: "التخصص موجود بالفعل",
  createdSuccessfully: "تم إنشاء التخصص بنجاح",
  notFound: "التخصص غير موجود",
  updatedSuccessfully: "تم تحديث التخصص بنجاح",
  alreadyInactive: "التخصص غير نشط بالفعل",
  deactivatedSuccessfully: "تم تعطيل التخصص بنجاح",
  invalidPage: "رقم الصفحة يجب أن يكون أكبر من صفر",
  invalidLimit: "الحد يجب أن يكون بين 1 و100",
  },
  dashboard: {
  invalidMonth: "الشهر يجب أن يكون بالصيغة YYYY-MM",
  fetchFailed: "فشل تحميل بيانات لوحة التحكم",
  },
  doctorSettlements: {
  doctorAndAmountRequired: "الطبيب والمبلغ مطلوبان",
  invalidDoctorId: "معرف الطبيب غير صالح",
  invalidOperationId: "معرف العملية غير صالح",
  invalidId: "معرف التسوية غير صالح",
  invalidAmount: "المبلغ يجب أن يكون أكبر من صفر",
  invalidNotes: "ملاحظات التسوية يجب أن تكون نصًا",
  invalidPage: "رقم الصفحة يجب أن يكون أكبر من صفر",
  invalidLimit: "الحد يجب أن يكون بين 1 و100",
  doctorNotFound: "الطبيب غير موجود",
  doctorInactive: "الطبيب غير نشط",
  operationNotFound: "العملية غير موجودة",
  operationDoctorMismatch: "هذه العملية لا تخص هذا الطبيب",
  cancelledOperation: "لا يمكن تسوية عملية ملغاة",
  operationHasNoDoctorFee: "هذه العملية لا تحتوي على أتعاب للطبيب",
  exceedsDoctorDue: "مبلغ التسوية أكبر من مستحقات الطبيب",
  exceedsOperationDue: "مبلغ التسوية أكبر من مستحقات الطبيب في هذه العملية",
  noOpenCashDrawer: "لا يوجد درج نقدية مفتوح",
  insufficientCash: "الرصيد النقدي في درج النقدية غير كافٍ",
  createdSuccessfully: "تم إنشاء تسوية الطبيب بنجاح",
  createFailed: "فشل إنشاء تسوية الطبيب",
  notFound: "تسوية الطبيب غير موجودة",
  fetchFailed: "فشل تحميل تسويات الطبيب",
  },
  cashTransactions: {
  invalidId: "معرف المعاملة النقدية غير صالح",
  invalidCashDrawerId: "معرف درج النقدية غير صالح",
  invalidDoctorId: "معرف الطبيب غير صالح",
  invalidOperationId: "معرف العملية غير صالح",
  invalidVisitId: "معرف الزيارة غير صالح",
  invalidPatientId: "معرف المريض غير صالح",
  invalidSaleId: "معرف البيع غير صالح",
  invalidPaymentId: "معرف الدفع غير صالح",
  invalidType: "نوع المعاملة النقدية غير صالح",
  invalidSource: "مصدر المعاملة النقدية غير صالح",
  invalidFromDate: "تاريخ البداية غير صالح",
  invalidToDate: "تاريخ النهاية غير صالح",
  invalidDateRange: "نطاق التاريخ غير صالح",
  invalidPage: "رقم الصفحة يجب أن يكون أكبر من صفر",
  invalidLimit: "الحد يجب أن يكون بين 1 و100",
  notFound: "المعاملة النقدية غير موجودة",
  fetchFailed: "فشل تحميل المعاملات النقدية",
  summaryFailed: "فشل تحميل ملخص المعاملات النقدية",
  },
  operations: {
  requiredFields: "المريض والطبيب والتخصص واسم العملية والتكلفة مطلوبة",
  invalidId: "معرف العملية غير صالح",
  invalidPatientId: "معرف المريض غير صالح",
  invalidDoctorId: "معرف الطبيب غير صالح",
  invalidSpecialtyId: "معرف التخصص غير صالح",
  invalidOperationName: "اسم العملية غير صالح",
  invalidOperationDate: "تاريخ العملية غير صالح",
  invalidNotes: "ملاحظات العملية يجب أن تكون نصًا",
  invalidCost: "التكلفة يجب أن تكون رقمًا صحيحًا وغير سالبة",
  invalidDiscount: "الخصم يجب أن يكون رقمًا صحيحًا وغير سالب",
  discountGreaterThanCost: "الخصم لا يمكن أن يكون أكبر من التكلفة",
  invalidDoctorFeeType: "نوع أتعاب الطبيب غير صالح",
  invalidDoctorFeeValue: "قيمة أتعاب الطبيب يجب أن تكون رقمًا صحيحًا وغير سالبة",
  doctorFeePercentageExceeded: "نسبة أتعاب الطبيب لا يمكن أن تتجاوز 100%",
  doctorFeeGreaterThanTotal: "أتعاب الطبيب لا يمكن أن تكون أكبر من قيمة العملية",
  patientNotFound: "المريض غير موجود",
  doctorNotFound: "الطبيب غير موجود",
  doctorInactive: "الطبيب غير نشط",
  specialtyNotFound: "التخصص غير موجود",
  specialtyInactive: "التخصص غير نشط",
  doctorSpecialtyMismatch: "تخصص الطبيب لا يطابق تخصص العملية",
  createdSuccessfully: "تم إنشاء العملية بنجاح",
  fetchFailed: "فشل تحميل العمليات",
  notFound: "العملية غير موجودة",
  invalidPage: "رقم الصفحة يجب أن يكون أكبر من صفر",
  invalidLimit: "الحد يجب أن يكون بين 1 و100",
  invalidSearch: "البحث يجب أن يكون نصًا",
  invalidStatus: "حالة العملية غير صالحة",
  invalidPaymentStatus: "حالة الدفع غير صالحة",
  cancelledCannotComplete: "لا يمكن إكمال عملية ملغاة",
  alreadyCompleted: "العملية مكتملة بالفعل",
  completedSuccessfully: "تم إكمال العملية بنجاح",
  completeFailed: "فشل إكمال العملية",
  cancelledCannotUpdate: "لا يمكن تعديل عملية ملغاة",
  financialDataLocked: "لا يمكن تعديل البيانات المالية بعد تسوية أتعاب الطبيب",
  totalLessThanPaid: "إجمالي العملية لا يمكن أن يكون أقل من المبلغ المدفوع بالفعل",
  hasPaymentsCannotCancel: "لا يمكن إلغاء عملية عليها مدفوعات",
  completedCannotReturnPending: "لا يمكن إعادة العملية المكتملة إلى حالة الانتظار",
  updatedSuccessfully: "تم تحديث العملية بنجاح",
  updateFailed: "فشل تحديث العملية",
  alreadyCancelled: "العملية ملغاة بالفعل",
  cancelledSuccessfully: "تم إلغاء العملية بنجاح",
  cancelFailed: "فشل إلغاء العملية",
  createFailed: "فشل إنشاء العملية",
  },
  consultations: {
  visitRequired: "الزيارة مطلوبة",
  invalidId: "معرف الاستشارة غير صالح",
  invalidVisitId: "معرف الزيارة غير صالح",
  invalidMedicineId: "معرف الدواء غير صالح",
  textFieldsMustBeString: "حقول الاستشارة النصية يجب أن تكون نصوصًا",
  visitNotFound: "الزيارة غير موجودة",
  cancelledVisit: "لا يمكن إنشاء أو إكمال استشارة لزيارة ملغاة",
  visitMustBeInConsultation: "يجب أن تكون الزيارة في حالة قيد الاستشارة",
  visitDoctorRequired: "يجب أن يكون للزيارة طبيب معين",
  alreadyExists: "توجد استشارة بالفعل لهذه الزيارة",
  createdSuccessfully: "تم إنشاء الاستشارة بنجاح",
  createFailed: "فشل إنشاء الاستشارة",
  notFound: "الاستشارة غير موجودة",
  fetchFailed: "فشل تحميل الاستشارة",
  cancelledVisitCannotUpdate: "لا يمكن تعديل استشارة لزيارة ملغاة",
  completedCannotUpdate: "لا يمكن تعديل الاستشارة بعد اكتمال الزيارة",
  updatedSuccessfully: "تم تحديث الاستشارة بنجاح",
  updateFailed: "فشل تحديث الاستشارة",
  itemsMustBeArray: "عناصر الوصفة يجب أن تكون في صورة مصفوفة",
  invalidPrescriptionItem: "كل عنصر في الوصفة يجب أن يحتوي على الدواء والكمية والجرعة والتكرار والمدة",
  invalidMedicineQuantity: "كمية الدواء يجب أن تكون رقمًا صحيحًا أكبر من صفر",
  invalidPrescriptionInstructions: "تعليمات الوصفة يجب أن تكون نصًا",
  medicineNotFound: "دواء واحد أو أكثر غير موجود",
  cancelledPrescription: "لا يمكن تعديل وصفة ملغاة",
  dispensedPrescription: "لا يمكن تعديل وصفة تم صرفها",
  patientMismatch: "المريض في الاستشارة لا يطابق المريض في الزيارة",
  doctorMismatch: "الطبيب في الاستشارة لا يطابق الطبيب في الزيارة",
  visitAlreadyCompleted: "الزيارة مكتملة بالفعل",
  completedWithPrescription: "تم إكمال الاستشارة والوصفة بنجاح",
  completedSuccessfully: "تم إكمال الاستشارة بنجاح",
  completeFailed: "فشل إكمال الاستشارة",
},
  system: {
    running:
      "واجهة برمجة تطبيقات نظام إدارة المستشفى تعمل بنجاح",
  },
};

module.exports = ar;