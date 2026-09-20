const mongoose = require("mongoose");
const medicineModels = require("../models/medicine.models");
const medicineCategoryModels = require("../models/medicineCategory.models");

const createMedicine = async (req, res) => {
  try {
    const medicines = Array.isArray(req.body.medicines)
      ? req.body.medicines
      : [req.body];

    if (medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: req.t("medicines.medicinesRequired"),
      });
    }

    const formattedMedicines = [];

    for (const medicine of medicines) {
      const {
        name,
        genericName,
        category,
        manufacturer,
        description,
      } = medicine;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        !category
      ) {
        return res.status(400).json({
          success: false,
          message: req.t("medicines.nameCategoryRequired"),
        });
      }

      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: req.t("common.invalidId"),
        });
      }

      const medicineName = name.trim();

      const medicineManufacturer =
        typeof manufacturer === "string"
          ? manufacturer.trim()
          : "";

      const medicineGenericName =
        typeof genericName === "string"
          ? genericName.trim()
          : "";

      const medicineDescription =
        typeof description === "string"
          ? description.trim()
          : "";

      const categoryExists =
        await medicineCategoryModels.findById(category);

      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: req.t("medicines.categoryNotFound"),
        });
      }

      if (!categoryExists.isActive) {
        return res.status(400).json({
          success: false,
          message: req.t("medicines.categoryInactive"),
        });
      }

      const existingMedicine =
        await medicineModels.findOne({
          name: medicineName,
          manufacturer: medicineManufacturer,
        });

      if (existingMedicine) {
        return res.status(409).json({
          success: false,
          message: req.t("medicines.medicineAlreadyExists"),
          medicine: medicineName,
        });
      }

      const duplicateInRequest =
        formattedMedicines.some(
          (item) =>
            item.name.toLowerCase() ===
              medicineName.toLowerCase() &&
            item.manufacturer.toLowerCase() ===
              medicineManufacturer.toLowerCase()
        );

      if (duplicateInRequest) {
        return res.status(409).json({
          success: false,
          message: req.t(
            "medicines.duplicateMedicineInRequest"
          ),
          medicine: medicineName,
        });
      }

      formattedMedicines.push({
        name: medicineName,
        genericName: medicineGenericName,
        category,
        manufacturer: medicineManufacturer,
        description: medicineDescription,
      });
    }

    const createdMedicines =
      await medicineModels.insertMany(
        formattedMedicines
      );

    return res.status(201).json({
      success: true,
      message: req.t(
        createdMedicines.length === 1
          ? "medicines.medicineCreatedSuccessfully"
          : "medicines.medicinesCreatedSuccessfully"
      ),
      count: createdMedicines.length,
      medicines: createdMedicines,
    });
  } catch (error) {
    console.error("Create Medicine Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getAllMedicines = async (req, res) => {
  try {
    const {
      search,
      category,
      manufacturer,
      isActive,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

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
          genericName: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          manufacturer: {
            $regex: searchValue,
            $options: "i",
          },
        },
      ];
    }

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: req.t("common.invalidId"),
        });
      }

      filter.category = category;
    }

    if (manufacturer?.trim()) {
      filter.manufacturer = {
        $regex: manufacturer.trim(),
        $options: "i",
      };
    }

    if (isActive !== undefined) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message: req.t("medicines.invalidIsActive"),
        });
      }

      filter.isActive = isActive === "true";
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
      await medicineModels.countDocuments(filter);

    const medicines = await medicineModels
      .find(filter)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      medicines,
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
    console.error("Get All Medicines Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const medicine = await medicineModels
      .findById(id)
      .populate(
        "category",
        "name description"
      );

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicines.medicineNotFound"
        ),
      });
    }

    return res.status(200).json({
      success: true,
      medicine,
    });
  } catch (error) {
    console.error("Get Medicine By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const {
      name,
      genericName,
      category,
      manufacturer,
      description,
      isActive,
    } = req.body;

    const medicine =
      await medicineModels.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicines.medicineNotFound"
        ),
      });
    }

    let finalName = medicine.name;
    let finalManufacturer = medicine.manufacturer;

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicines.invalidName"
          ),
        });
      }

      finalName = name.trim();
    }

    if (manufacturer !== undefined) {
      if (typeof manufacturer !== "string") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicines.invalidManufacturer"
          ),
        });
      }

      finalManufacturer =
        manufacturer.trim();
    }

    if (
      name !== undefined ||
      manufacturer !== undefined
    ) {
      const existingMedicine =
        await medicineModels.findOne({
          name: finalName,
          manufacturer: finalManufacturer,
          _id: { $ne: id },
        });

      if (existingMedicine) {
        return res.status(409).json({
          success: false,
          message: req.t(
            "medicines.medicineAlreadyExists"
          ),
        });
      }
    }

    if (category !== undefined) {
      if (
        !mongoose.Types.ObjectId.isValid(category)
      ) {
        return res.status(400).json({
          success: false,
          message: req.t("common.invalidId"),
        });
      }

      const categoryExists =
        await medicineCategoryModels.findById(
          category
        );

      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: req.t(
            "medicines.categoryNotFound"
          ),
        });
      }

      if (!categoryExists.isActive) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicines.categoryInactive"
          ),
        });
      }

      medicine.category = category;
    }

    if (name !== undefined) {
      medicine.name = finalName;
    }

    if (genericName !== undefined) {
      if (typeof genericName !== "string") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicines.invalidGenericName"
          ),
        });
      }

      medicine.genericName =
        genericName.trim();
    }

    if (manufacturer !== undefined) {
      medicine.manufacturer =
        finalManufacturer;
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicines.invalidDescription"
          ),
        });
      }

      medicine.description =
        description.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicines.invalidIsActive"
          ),
        });
      }

      medicine.isActive = isActive;
    }

    const updatedMedicine =
      await medicine.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "medicines.medicineUpdatedSuccessfully"
      ),
      medicine: updatedMedicine,
    });
  } catch (error) {
    console.error("Update Medicine Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const medicine =
      await medicineModels.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicines.medicineNotFound"
        ),
      });
    }

    medicine.isActive = false;

    await medicine.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "medicines.medicineDeactivatedSuccessfully"
      ),
    });
  } catch (error) {
    console.error("Delete Medicine Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

module.exports = {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
};