const medicineModels = require("../models/medicine.models");
const medicineCategoryModels = require("../models/medicineCategory.models");


const createMedicine = async (req, res) => {
  try {
    // Support single medicine or multiple medicines
    const medicines = Array.isArray(req.body.medicines)? req.body.medicines: [req.body];

    if (medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one medicine is required",
      });
    }

    // --------------------------------
    // Validate all medicines
    // --------------------------------

    const formattedMedicines = [];

    for (const medicine of medicines) {
      const {
        name,
        genericName,
        category,
        manufacturer,
        description,
      } = medicine;

      // Required fields
      if (!name || !category) {
        return res.status(400).json({
          success: false,
          message: "Medicine name and category are required",
        });
      }

      // Check category
      const categoryExists =
        await medicineCategoryModels.findById(category);

      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: `Medicine category not found for medicine: ${name}`,
        });
      }

      // Check category status
      if (!categoryExists.isActive) {
        return res.status(400).json({
          success: false,
          message: `Medicine category is inactive for medicine: ${name}`,
        });
      }

      // Clean values
      const medicineName = name.trim();
      const medicineManufacturer =
        manufacturer?.trim() || "";

      // Check duplicate in database
      const existingMedicine =
        await medicineModels.findOne({
          name: medicineName,
          manufacturer: medicineManufacturer,
        });

      if (existingMedicine) {
        return res.status(409).json({
          success: false,
          message: `Medicine already exists: ${medicineName}`,
        });
      }

      // Check duplicate inside the same request
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
          message: `Duplicate medicine in request: ${medicineName}`,
        });
      }

      formattedMedicines.push({
        name: medicineName,
        genericName: genericName?.trim() || "",
        category,
        manufacturer: medicineManufacturer,
        description: description?.trim() || "",
      });
    }

    // --------------------------------
    // Create medicines
    // --------------------------------

    const createdMedicines =
      await medicineModels.insertMany(formattedMedicines);

    return res.status(201).json({
      success: true,
      message:
        createdMedicines.length === 1
          ? "Medicine created successfully"
          : "Medicines created successfully",

      count: createdMedicines.length,

      medicines: createdMedicines,
    });

  } catch (error) {
    console.error("CREATE MEDICINE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// Get All Medicines
const getAllMedicines = async (req, res) => {
  console.log('medicine');
  
  try {
    const { search, category, manufacturer, isActive, page = 1, limit = 10 } = req.query;

    const filter = {};
    // Search
    if (search) {
      filter.$or = [
        {name: {$regex: search,$options: "i"} },
        {genericName: { $regex: search, $options: "i"}},
        {manufacturer: {  $regex: search,  $options: "i"}},
      ];
    }
    // Category filter
    if (category) filter.category = category

    // Manufacturer filter
    if (manufacturer)  filter.manufacturer = {$regex: manufacturer,$options: "i"}

    // Active filter
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // Pagination
    const pageNumber = Math.max(Number(page) || 1, 1); // 10
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100 ); //15

    const skip = (pageNumber - 1) * limitNumber;
    const total = await medicineModels.countDocuments(filter);
    const medicines = await medicineModels.find(filter)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      medicines,
      pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber)}
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Single Medicine
const getMedicineById = async (req, res) => {
  try {
    const medicine = await medicineModels.findById(req.params.id).populate(
      "category",
      "name description"
    );

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    return res.status(200).json({
      success: true,
      medicine,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update Medicine
const updateMedicine = async (req, res) => {
  try {
    const { name, genericName, category, manufacturer, description, isActive,} = req.body;

    const medicine = await medicineModels.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    if (category !== undefined) {
      const categoryExists = await medicineCategoryModels.findById(category);

      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Medicine category not found",
        });
      }

      if (!categoryExists.isActive) {
        return res.status(400).json({
          success: false,
          message: "Medicine category is inactive",
        });
      }

      medicine.category = category;
    }

    if (name !== undefined) {
      medicine.name = name.trim();
    }

    if (genericName !== undefined) {
      medicine.genericName = genericName;
    }

    if (manufacturer !== undefined) {
      medicine.manufacturer = manufacturer;
    }

    if (description !== undefined) {
      medicine.description = description;
    }

    if (isActive !== undefined) {
      medicine.isActive = isActive;
    }

    const updatedMedicine = await medicine.save();

    return res.status(200).json({
      success: true,
      message: "Medicine updated successfully",
      medicine: updatedMedicine,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Deactivate Medicine
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await medicineModels.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    medicine.isActive = false;

    await medicine.save();

    return res.status(200).json({
      success: true,
      message: "Medicine deactivated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
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