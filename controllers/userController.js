const userModels = require("../models/user.models");


// Get all users
const getAllUsers = async (req, res) => {
  
  try {
    const { search, role, isActive ,page,limit } = req.query
    
    const filter = {}
    if (isActive !== undefined) filter.isActive = (isActive === "true")
    if (role) { filter.role = role }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i", }, },
          ];
    }

    // Pagination
    const pageNumber = Math.max( Number(page) || 1, 1);
    const limitNumber = Math.min( Math.max(Number(limit) || 10, 1), 100 );
    const skip = (pageNumber - 1) * limitNumber;
    const total = await userModels.countDocuments(filter);
    console.log(filter);
    
    const users = await userModels.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages :Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single user
const getUserById = async (req, res) => {
  try {
    const user = await userModels.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

    const user = await userModels.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields only if provided
    if (name !== undefined) {
      user.name = name;
    }

    if (email !== undefined) {
      user.email = email;
    }

    if (role !== undefined) {
      user.role = role;
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
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

// Delete user
const deleteUser = async (req, res) => {
  
  try {
    const user = await userModels.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User deactivated successfully",
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
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};