const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: req.t('common.notAuthorized'),
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: req.t('common.noPermission'),
      });
    }

    next();
  };
};

module.exports = authorize;