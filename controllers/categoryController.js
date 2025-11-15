const Category = require("../models/categoryModel");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");

// Multer (in-memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadMiddleware = upload.single("image");

// ✅ Create Category
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    let imageUrl = null;
    let publicId = null;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "Namur_categories" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      imageUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    }

    const category = await Category.createCategory(name, imageUrl, publicId);
    res.status(201).json({ message: "Category created", category });
  } catch (err) {
    console.error("❌ Error creating category:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get All Categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.getCategories();
    res.json(categories);
  } catch (err) {
    console.error("❌ Error fetching categories:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Update Category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const existing = await Category.getCategoryById(id);
    if (!existing) return res.status(404).json({ message: "Category not found" });

    let imageUrl = existing.image_url;
    let publicId = existing.image_public_id;

    if (req.file) {
      // Delete old image from Cloudinary
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }

      // Upload new one
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "Namur_categories" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });

      imageUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    }

    const updated = await Category.updateCategory(id, name, imageUrl, publicId);
    res.json({ message: "Category updated", category: updated });
  } catch (err) {
    console.error("❌ Error updating category:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Delete Category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.getCategoryById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    // Delete image from Cloudinary if exists
    if (category.image_public_id) {
      await cloudinary.uploader.destroy(category.image_public_id);
    }

    await Category.deleteCategory(id);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting category:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};