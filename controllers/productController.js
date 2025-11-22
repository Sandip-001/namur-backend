const pool = require("../config/db");
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
    const { name, category_id, subcategory_id, breeds } = req.body;

    if (!name || !category_id || !subcategory_id) {
      return res.status(400).json({
        message: "Name, category_id, and subcategory_id are required",
      });
    }

    // Fetch category name
    const categoryRes = await pool.query(
      "SELECT name FROM categories WHERE id=$1",
      [category_id]
    );

    if (categoryRes.rowCount === 0) {
      return res.status(400).json({ message: "Invalid category_id" });
    }

    const categoryName = categoryRes.rows[0].name.toLowerCase();

    // If food OR animal → breeds mandatory
    if ((categoryName === "food" || categoryName === "animal")) {
      if (!breeds || !Array.isArray(JSON.parse(breeds)) || JSON.parse(breeds).length === 0) {
        return res.status(400).json({
          message: "Breeds array is required for FOOD or ANIMAL category",
        });
      }
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
      subcategory_id,
      breeds ? JSON.parse(breeds) : []
    );

    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.error("Error creating product:", err);
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


//Get products as per category name
exports.getProductsByCategoryName = async (req, res) => {
  try {
    const { categoryName } = req.query;

    if (!categoryName) {
      return res.status(400).json({ error: "categoryName is required" });
    }

    const products = await Product.getProductsByCategoryName(categoryName);

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
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


// ✅ Update product (partial + Cloudinary + category rules)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = { ...req.body };

    const existing = await Product.getProductById(id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    // -----------------------------------------------------
    // 🔍 1. Parse breeds only if provided
    // -----------------------------------------------------
    let breedsUpdated = null;
    if (fields.breeds) {
      try {
        breedsUpdated = JSON.parse(fields.breeds);
        if (!Array.isArray(breedsUpdated))
          return res.status(400).json({ message: "Breeds must be an array" });
        fields.breeds = breedsUpdated;
      } catch {
        return res.status(400).json({ message: "Invalid breeds format. Must be JSON array." });
      }
    }

    // -----------------------------------------------------
    // 🔍 2. Determine the NEW category name
    // -----------------------------------------------------
    let newCategoryId = fields.category_id || existing.category_id;

    const categoryRes = await pool.query(
      "SELECT name FROM categories WHERE id=$1",
      [newCategoryId]
    );

    if (categoryRes.rowCount === 0) {
      return res.status(400).json({ message: "Invalid category_id" });
    }

    const newCategoryName = categoryRes.rows[0].name.toLowerCase();

    const isNewCatBreedRequired =
      newCategoryName === "food" || newCategoryName === "animal";

    // -----------------------------------------------------
    // 🔍 3. Apply breed validation rules
    // -----------------------------------------------------

    if (isNewCatBreedRequired) {
      // ✔ Food or Animal → breeds MUST be provided (if category changed)
      const categoryChanged =
        fields.category_id && fields.category_id != existing.category_id;

      if (categoryChanged && !fields.breeds) {
        return res.status(400).json({
          message: "Breeds are required when changing category to FOOD or ANIMAL",
        });
      }
    } else {
      // ❌ Any other category → breeds must be reset to []
      fields.breeds = [];
    }

    // -----------------------------------------------------
    // 🔍 4. Image handling
    // -----------------------------------------------------
    if (req.file) {
      if (existing.image_public_id) {
        await cloudinary.uploader.destroy(existing.image_public_id);
      }

      const uploadResult = await uploadToCloudinary(req.file.buffer);
      fields.image_url = uploadResult.secure_url;
      fields.image_public_id = uploadResult.public_id;
    }

    // -----------------------------------------------------
    // 🔍 5. Update product
    // -----------------------------------------------------
    const updated = await Product.updateProduct(id, fields);

    res.json({ message: "Product updated", product: updated });

  } catch (err) {
    console.error("Error updating product:", err);
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