const mongoose = require("mongoose");

const supplierModels = require("../models/supplier.models");

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Create Supplier
const createSupplier = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof phone !== "string" ||
      !phone.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "suppliers.namePhoneRequired"
        ),
      });
    }

    const supplierName = name.trim();
    const supplierPhone = phone.trim();
    const supplierEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

    const supplierAddress =
      typeof address === "string"
        ? address.trim()
        : "";

    if (
      supplierEmail &&
      !isValidEmail(supplierEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t(
          "suppliers.invalidEmail"
        ),
      });
    }

    const existingSupplier =
      await supplierModels.findOne({
        name: {
          $regex: `^${escapeRegex(
            supplierName
          )}$`,
          $options: "i",
        },
      });

    if (existingSupplier) {
      return res.status(409).json({
        success: false,
        message: req.t(
          "suppliers.alreadyExists"
        ),
      });
    }

    const supplier =
      await supplierModels.create({
        name: supplierName,
        phone: supplierPhone,
        email: supplierEmail,
        address: supplierAddress,
      });

    return res.status(201).json({
      success: true,
      message: req.t(
        "suppliers.createdSuccessfully"
      ),
      supplier,
    });
  } catch (error) {
    console.error(
      "Create Supplier Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Get All Suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const {
      search,
      isActive,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (search?.trim()) {
      const searchValue = escapeRegex(
        search.trim()
      );

      filter.$or = [
        {
          name: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          email: {
            $regex: searchValue,
            $options: "i",
          },
        },
      ];
    }

    if (isActive !== undefined) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "suppliers.invalidIsActive"
          ),
        });
      }

      filter.isActive =
        isActive === "true";
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
      (pageNumber - 1) * limitNumber;

    const total =
      await supplierModels.countDocuments(
        filter
      );

    const suppliers =
      await supplierModels
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    return res.status(200).json({
      success: true,
      suppliers,
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
      "Get All Suppliers Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Get Single Supplier
const getSingleSupplier = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const supplier =
      await supplierModels.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "suppliers.notFound"
        ),
      });
    }

    return res.status(200).json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error(
      "Get Single Supplier Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Update Supplier
const updateSupplier = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const supplier =
      await supplierModels.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "suppliers.notFound"
        ),
      });
    }

    const {
      name,
      phone,
      email,
      address,
      isActive,
    } = req.body;

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "suppliers.invalidName"
          ),
        });
      }

      const supplierName = name.trim();

      const existingSupplier =
        await supplierModels.findOne({
          name: {
            $regex: `^${escapeRegex(
              supplierName
            )}$`,
            $options: "i",
          },
          _id: { $ne: id },
        });

      if (existingSupplier) {
        return res.status(409).json({
          success: false,
          message: req.t(
            "suppliers.alreadyExists"
          ),
        });
      }

      supplier.name = supplierName;
    }

    if (phone !== undefined) {
      if (
        typeof phone !== "string" ||
        !phone.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "suppliers.invalidPhone"
          ),
        });
      }

      supplier.phone = phone.trim();
    }

    if (email !== undefined) {
      if (
        email !== null &&
        typeof email !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "suppliers.invalidEmail"
          ),
        });
      }

      const supplierEmail =
        typeof email === "string"
          ? email.trim().toLowerCase()
          : "";

      if (
        supplierEmail &&
        !isValidEmail(supplierEmail)
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "suppliers.invalidEmail"
          ),
        });
      }

      supplier.email = supplierEmail;
    }

    if (address !== undefined) {
      if (
        address !== null &&
        typeof address !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: req.t(
            "suppliers.invalidAddress"
          ),
        });
      }

      supplier.address =
        typeof address === "string"
          ? address.trim()
          : "";
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: req.t(
            "suppliers.invalidIsActive"
          ),
        });
      }

      supplier.isActive = isActive;
    }

    await supplier.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "suppliers.updatedSuccessfully"
      ),
      supplier,
    });
  } catch (error) {
    console.error(
      "Update Supplier Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

// Deactivate Supplier
const deactivateSupplier = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("common.invalidId"),
      });
    }

    const supplier =
      await supplierModels.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: req.t(
          "suppliers.notFound"
        ),
      });
    }

    supplier.isActive = false;

    await supplier.save();

    return res.status(200).json({
      success: true,
      message: req.t(
        "suppliers.deactivatedSuccessfully"
      ),
      supplier,
    });
  } catch (error) {
    console.error(
      "Deactivate Supplier Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: req.t("common.serverError"),
    });
  }
};

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSingleSupplier,
  updateSupplier,
  deactivateSupplier,
};