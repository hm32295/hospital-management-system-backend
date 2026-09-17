const express = require("express");

const {createCategory,getAllCategories, getCategoryById,updateCategory,deleteCategory,} = require("../controllers/medicineCategoryController");

const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const medicineCategoryRouter = express.Router();

// Get all
medicineCategoryRouter.get("/",protect,authorize("admin", "pharmacist"),getAllCategories);
// Get one
medicineCategoryRouter.get( "/:id", protect, authorize("admin", "pharmacist"), getCategoryById);
// Create
medicineCategoryRouter.post( "/", protect, authorize("admin", "pharmacist"), createCategory);
// Update
medicineCategoryRouter.put( "/:id", protect, authorize("admin", "pharmacist"), updateCategory);
// Deactivate
medicineCategoryRouter.delete( "/:id", protect, authorize("admin", "pharmacist"), deleteCategory);

module.exports = medicineCategoryRouter;