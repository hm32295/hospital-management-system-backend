const supplierModels = require("../models/supplier.models");


// Create Supplier
const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ success: false, message: "Name and phone are required" });
    }

    const existingSupplier = await supplierModels.findOne({name: {$regex:`^${name}$`,$options:"i",}});

    if (existingSupplier) {
        return res.status(409).json({ success: false, message: "Supplier already exists", });
    }

    const supplier = await supplierModels.create({ name, phone, email, address});

    return res.status(201).json({ success: true, message: "Supplier created successfully", supplier});
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
    });
  }
};


// Get All Suppliers
const getAllSuppliers = async (req, res) => {
  console.log(req.query );
  try {
    const { search, isActive, page = 1, limit = 10} = req.query;

    
    const filter = {};

    // Search
      if (search) {
          filter.$or = [{ name: { $regex: search, $options: "i" } },
              { phone: { $regex: search, $options: "i", }, },
              { email: { $regex: search, $options: "i", }, },
          ];
    }

    // Active filter
    if (isActive !== undefined) filter.isActive = isActive === "true"

    // Pagination
    const pageNumber = Math.max( Number(page) || 1, 1);

    const limitNumber = Math.min( Math.max(Number(limit) || 10, 1), 100 );

    const skip = (pageNumber - 1) * limitNumber;

    const total = await supplierModels.countDocuments(filter);

      const suppliers = await supplierModels.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber);

      return res.status(200).json({
          success: true, suppliers,
          pagination: {
              page: pageNumber, limit: limitNumber, total,
              pages: Math.ceil(total / limitNumber),
          },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
    });
  }
};


// Get Single Supplier
const getSingleSupplier = async (req, res) => {
  try {

    const supplier = await supplierModels.findById(req.params.id);

    if (!supplier) { return res.status(404).json({   success: false,   message: "Supplier not found", });
    }

    return res.status(200).json({ success: true, supplier,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
    });
  }
};


// Update Supplier
const updateSupplier = async (req, res) => {
  try {

    const supplier = await supplierModels.findById(req.params.id);

    if (!supplier) return res.status(404).json({ success: false,   message: "Supplier not found", });
    

    const { name, phone, email, address, isActive} = req.body;

    if (name !== undefined) supplier.name = name;

    if (phone !== undefined) supplier.phone = phone;
    
    if (email !== undefined) supplier.email = email;

    if (address !== undefined) supplier.address = address;

    if (isActive !== undefined)  supplier.isActive = isActive;

    await supplier.save();

    return res.status(200).json({ success: true, message: "Supplier updated successfully", supplier,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
    });
  }
};


// Deactivate Supplier
const deactivateSupplier = async (req, res) => {

  try {

    const supplier = await supplierModels.findById(req.params.id);

    if (!supplier) { return res.status(404).json({   success: false,   message: "Supplier not found", });
    }

    supplier.isActive = false;

    await supplier.save();

    return res.status(200).json({ success: true, message: "Supplier deactivated successfully", supplier,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message,
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