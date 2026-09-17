const medicineCategoryModels = require("../models/medicineCategory.models");

// Create Category
const createCategory = async (req, res) => {
  const { categories } = req.body;
  console.log(categories);
  
  try {

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Categories must be a non-empty array",
      });
    }

    const formattedCategories = categories.map((category) => ({
      name: category.name?.trim(),
      description: category.description?.trim() || "",
    }));

    for (const category of formattedCategories) {
      if (!category.name) {
        return res.status(400).json({
          success: false,
          message: "Each category must have a name",
        });
      }
    }

    const names = formattedCategories.map((category) => category.name);

    const existingCategories = await medicineCategoryModels.find({
      name: { $in: names },
    });

    if (existingCategories.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Some categories already exist",
        categories: existingCategories.map((category) => category.name),
      });
    }

    const createdCategories =
      await medicineCategoryModels.insertMany(formattedCategories);

    return res.status(201).json({
      success: true,
      message: "Categories created successfully",
      count: createdCategories.length,
      categories: createdCategories,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get All Categories

const getAllCategories = async (req, res) => {
  
  try {
    const {search,isActive ,page = 1,limit = 10} = req.query;
    const filter = search?.trim() ? { name: { $regex: search.trim(), $options: "i" } } : {};
    if(isActive !== undefined) filter.isActive = isActive;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1),100);
    const skip =(pageNumber - 1) * limitNumber;
    const total =await medicineCategoryModels.countDocuments();
    const categories =await medicineCategoryModels.find(filter)
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
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// Get Single Category
const getCategoryById = async (req, res) => {
  try {
    const category = await medicineCategoryModels.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false,message: "Category not found",});
    }

    return res.status(200).json({success: true,category });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update Category
const updateCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    const category = await medicineCategoryModels.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name !== undefined) {
      const existingCategory = await medicineCategoryModels.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Category name already exists",
        });
      }

      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description;
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    const updatedCategory = await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete / Deactivate Category
const deleteCategory = async (req, res) => {
  try {
    const category = await medicineCategoryModels.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = false;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category deactivated successfully",
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
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};