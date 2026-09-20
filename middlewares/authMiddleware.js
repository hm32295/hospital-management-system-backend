const jwt = require("jsonwebtoken");
const userModels = require("../models/user.models");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
       message: req.t("common.tokenMissing"),
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModels.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: req.t('common.userNotFound'),
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: req.t('common.accountInactive'),
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: req.t("common.invalidOrExpiredToken"),
    });
  }
};

module.exports = protect;