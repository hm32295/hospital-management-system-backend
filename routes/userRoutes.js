const express = require("express");

const {  getAllUsers,  getUserById,  updateUser,  deleteUser,} = require("../controllers/userController");
const protect = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");


const userRouter = express.Router();

userRouter.get( "/",getAllUsers)
userRouter.get( "/", protect, authorize("admin"),getAllUsers)
            .get("/:id",protect,authorize("admin"),getUserById)
            .put("/:id",protect, authorize("admin"), updateUser)
            .delete("/:id", protect,authorize("admin"), deleteUser);

module.exports = userRouter;