const jwt = require("jsonwebtoken");
const userModels = require("../models/user.models");

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "auth.nameEmailPasswordRequired"
        ),
      });
    }

    const existingUser =
      await userModels.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: req.t(
          "auth.userAlreadyExists"
        ),
      });
    }

    const user = await userModels.create({
      name,
      email,
      password,
      role: "patient",
    });

    return res.status(201).json({
      success: true,
      message: req.t(
        "auth.registeredSuccessfully"
      ),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "auth.emailPasswordRequired"
        ),
      });
    }

    const user = await userModels.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: req.t(
          "auth.invalidCredentials"
        ),
      });
    }

    const isPasswordMatch =
      await user.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: req.t(
          "auth.invalidCredentials"
        ),
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: req.t(
          "auth.accountInactive"
        ),
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
          process.env.JWT_EXPIRES_IN ||
          "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: req.t(
        "auth.loginSuccessful"
      ),
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: req.t(
        "common.serverError"
      ),
    });
  }
};

module.exports = {
  register,
  login,
};