const Product = require("../models/productModel");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");

// Multer (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadMiddleware = upload.single("image"); // middleware for single image upload

// ✅ Helper: upload image to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "products" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// ✅ Create new product
exports.createProduct = async (req, res) => {
  try {
    const { name, category_id, subcategory_id } = req.body;
    if (!name || !category_id || !subcategory_id) {
      return res
        .status(400)
        .json({ message: "Name, category_id, and subcategory_id are required" });
    }

    let imageUrl = null;
    let publicId = null;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const product = await Product.createProduct(
      name,
      imageUrl,
      publicId,
      category_id,
      subcategory_id
    );

    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.error("Error creating product:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.getProducts();
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get products by subcategory
exports.getProductsBySubcategory = async (req, res) => {
  try {
    const { subcategory_id } = req.params;

    if (!subcategory_id) {
      return res.status(400).json({ message: "Subcategory ID is required" });
    }

    const products = await Product.getProductsBySubcategory(subcategory_id);

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found for this subcategory" });
    }

    res.json(products);
  } catch (err) {
    console.error("Error fetching products by subcategory:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Update product (partial + Cloudinary cleanup)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = { ...req.body };

    const existing = await Product.getProductById(id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    // If new image uploaded, delete old one from Cloudinary
    if (req.file) {
      if (existing.image_public_id) {
        await cloudinary.uploader.destroy(existing.image_public_id);
      }

      const uploadResult = await uploadToCloudinary(req.file.buffer);
      fields.image_url = uploadResult.secure_url;
      fields.image_public_id = uploadResult.public_id;
    }

    const updated = await Product.updateProduct(id, fields);
    res.json({ message: "Product updated", product: updated });
  } catch (err) {
    console.error("Error updating product:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Delete product (also delete image from Cloudinary)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.deleteProduct(id);

    if (product?.image_public_id) {
      await cloudinary.uploader.destroy(product.image_public_id);
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};