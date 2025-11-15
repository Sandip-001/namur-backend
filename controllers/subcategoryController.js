const Subcategory = require("../models/subcategoryModel");

// Create new subcategory
exports.createSubcategory = async (req, res) => {
  try {
    const { name, category_id } = req.body;
    if (!name || !category_id)
      return res.status(400).json({ message: "Name and category_id are required" });

    const subcategory = await Subcategory.createSubcategory(category_id, name);
    res.status(201).json({ message: "Subcategory created", subcategory });
  } catch (err) {
    console.error("Error creating subcategory:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all subcategories
exports.getSubcategories = async (req, res) => {
  try {
    const subcategories = await Subcategory.getSubcategories();
    res.json(subcategories);
  } catch (err) {
    console.error("Error fetching subcategories:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get subcategories by category_id
exports.getSubcategoriesByCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const subcategories = await Subcategory.getSubcategoriesByCategoryId(category_id);
    res.json(subcategories);
  } catch (err) {
    console.error("Error fetching subcategories by category:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update subcategory (partial update allowed)
exports.updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id } = req.body;

    const updated = await Subcategory.updateSubcategory(id, name, category_id);
    res.json({ message: "Subcategory updated", subcategory: updated });
  } catch (err) {
    console.error("Error updating subcategory:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete subcategory
exports.deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Subcategory.deleteSubcategory(id);
    res.json(result);
  } catch (err) {
    console.error("Error deleting subcategory:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};