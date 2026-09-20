const mongoose = require("mongoose");

const userModels = require("../models/user.models");

const allowedRoles = [
  "admin",
  "doctor",
  "pharmacist",
  "nurse",
  "patient",
  "lab_technician",
  "receptionist",
];

const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      isActive,
      page,
      limit,
    } = req.query;

    const filter = {};

    if (isActive !== undefined) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "users.invalidIsActive"
          ),
        });
      }

      filter.isActive =
        isActive === "true";
    }

    if (role) {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "users.invalidRole"
          ),
        });
      }

      filter.role = role;
    }

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ];
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
      (pageNumber - 1) *
      limitNumber;

    const total =
      await userModels.countDocuments(
        filter
      );

    const users =
      await userModels
        .find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      users,
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
    console.error(
      "Get All Users Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "common.invalidId"
        ),
      });
    }

    const user =
      await userModels
        .findById(id)
        .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "common.userNotFound"
        ),
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "Get User By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "common.invalidId"
        ),
      });
    }

    const {
      name,
      email,
      role,
      isActive,
    } = req.body;

    const user =
      await userModels.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "common.userNotFound"
        ),
      });
    }

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "users.nameInvalid"
          ),
        });
      }

      user.name = name.trim();
    }

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "users.emailInvalid"
          ),
        });
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      const emailExists =
        await userModels.findOne({
          email: normalizedEmail,
          _id: { $ne: id },
        });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: req.t(
            "users.emailAlreadyExists"
          ),
        });
      }

      user.email = normalizedEmail;
    }

    if (role !== undefined) {
      if (
        !allowedRoles.includes(role)
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "users.invalidRole"
          ),
        });
      }

      user.role = role;
    }

    if (isActive !== undefined) {
      if (
        typeof isActive !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "users.invalidIsActive"
          ),
        });
      }

      if (
        String(user._id) ===
          String(req.user._id) &&
        isActive === false
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "users.cannotDeactivateSelf"
          ),
        });
      }

      user.isActive = isActive;
    }

    const updatedUser =
      await user.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "users.updatedSuccessfully"
      ),
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive:
          updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error(
      "Update User Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "common.invalidId"
        ),
      });
    }

    if (
      String(req.user._id) ===
      String(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "users.cannotDeactivateSelf"
        ),
      });
    }

    const user =
      await userModels.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "common.userNotFound"
        ),
      });
    }

    user.isActive = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "users.deactivatedSuccessfully"
      ),
    });
  } catch (error) {
    console.error(
      "Delete User Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};