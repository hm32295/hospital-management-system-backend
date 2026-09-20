const mongoose = require("mongoose");
const medicineCategoryModels = require("../models/medicineCategory.models");

// Create Categories
const createCategory = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: req.t("medicineCategories.categoriesRequired"),
      });
    }

    const formattedCategories = categories.map((category) => ({
      name: typeof category?.name === "string"
        ? category.name.trim()
        : "",
      description:
        typeof category?.description === "string"
          ? category.description.trim()
          : "",
    }));

    for (const category of formattedCategories) {
      if (!category.name) {
        return res.status(400).json({
          success: false,
          message: req.t("medicineCategories.categoryNameRequired"),
        });
      }
    }

    const names = formattedCategories.map((category) => category.name);
    const normalizedNames = names.map((name) => name.toLowerCase());

    const duplicatedNames = normalizedNames.filter(
      (name, index) => normalizedNames.indexOf(name) !== index
    );

    if (duplicatedNames.length > 0) {
      return res.status(409).json({
        success: false,
        message: req.t("medicineCategories.categoriesAlreadyExist"),
        categories: [...new Set(duplicatedNames)],
      });
    }

    const existingCategories = await medicineCategoryModels.find({
      name: { $in: names },
    });

    if (existingCategories.length > 0) {
      return res.status(409).json({
        success: false,
        message: req.t("medicineCategories.categoriesAlreadyExist"),
        categories: existingCategories.map(
          (category) => category.name
        ),
      });
    }

    const createdCategories =
      await medicineCategoryModels.insertMany(formattedCategories);

    return res.status(201).json({
      success: true,
      message: req.t(
        "medicineCategories.categoryCreatedSuccessfully"
      ),
      count: createdCategories.length,
      categories: createdCategories,
    });
  } catch (error) {
    console.error("Create Medicine Categories Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Get All Categories
const getAllCategories = async (req, res) => {
  try {
    const {
      search,
      isActive,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (search?.trim()) {
      filter.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    if (isActive !== undefined) {
      if (isActive !== "true" && isActive !== "false") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineCategories.invalidIsActive"
          ),
        });
      }

      filter.isActive = isActive === "true";
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip = (pageNumber - 1) * limitNumber;

    const total =
      await medicineCategoryModels.countDocuments(filter);

    const categories = await medicineCategoryModels
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      categories,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get Medicine Categories Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Get Single Category
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const category =
      await medicineCategoryModels.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicineCategories.categoryNotFound"
        ),
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get Medicine Category Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Update Category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const { name, description, isActive } = req.body;

    const category =
      await medicineCategoryModels.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicineCategories.categoryNotFound"
        ),
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineCategories.invalidName"
          ),
        });
      }

      const normalizedName = name.trim();

      const existingCategory =
        await medicineCategoryModels.findOne({
          name: normalizedName,
          _id: { $ne: id },
        });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: req.t(
            "medicineCategories.categoryNameAlreadyExists"
          ),
        });
      }

      category.name = normalizedName;
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineCategories.invalidDescription"
          ),
        });
      }

      category.description = description.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "medicineCategories.invalidIsActive"
          ),
        });
      }

      category.isActive = isActive;
    }

    const updatedCategory = await category.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "medicineCategories.categoryUpdatedSuccessfully"
      ),
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Update Medicine Category Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Delete / Deactivate Category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const category =
      await medicineCategoryModels.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "medicineCategories.categoryNotFound"
        ),
      });
    }

    category.isActive = false;

    await category.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "medicineCategories.categoryDeactivatedSuccessfully"
      ),
    });
  } catch (error) {
    console.error("Delete Medicine Category Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};