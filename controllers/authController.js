
const jwt = require("jsonwebtoken");
const userModels = require("../models/user.models");

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingUser = await userModels.findOne({ email });

    if (existingUser) {
      return res.status(409).json({success: false, message: "User already exists"});
    }

    const user = await userModels.create({ name, email, password, role});

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email, role: user.role}
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message});
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({success: false, message: "Email and password are required"});
    }

    const user = await userModels.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({success: false,message: "Invalid email or password"});
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {userId: user._id,role: user.role},
      process.env.JWT_SECRET,
      {expiresIn: process.env.JWT_EXPIRES_IN || "7d",}
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
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

module.exports = {
  register,
  login,
};