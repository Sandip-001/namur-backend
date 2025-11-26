const CropCalendar = require("../models/cropCalendarModel");

// Create Crop Calendar
exports.createCropCalendar = async (req, res) => {
  try {
    const {
      sub_category_id,
      product_id,
      crop_details,
      cost_estimate,
      cultivation_tips,
      paste_and_diseases,
      stages_selection,
    } = req.body;

    if (!sub_category_id || !product_id) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const cropCalendar = await CropCalendar.createCropCalendar({
      sub_category_id,
      product_id,
      crop_details,
      cost_estimate,
      cultivation_tips,
      paste_and_diseases,
      stages_selection,
    });

    res.status(201).json({ message: "Crop calendar created", cropCalendar });
  } catch (err) {
    console.error("❌ Error creating crop calendar:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All
exports.getCropCalendars = async (req, res) => {
  try {
    const data = await CropCalendar.getCropCalendars();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get by Product ID
exports.getCropCalendarByProductId = async (req, res) => {
  try {
    const { product_id } = req.params;
    const data = await CropCalendar.getCropCalendarByProductId(product_id);

    if (!data.length)
      return res.status(404).json({ message: "No crop calendar found" });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update
exports.updateCropCalendar = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await CropCalendar.getCropCalendarById(id);

    if (!existing) return res.status(404).json({ message: "Not found" });

    const updated = await CropCalendar.updateCropCalendar(id, {
      ...existing,
      ...req.body,
    });

    res.json({ message: "Updated successfully", cropCalendar: updated });
  } catch (err) {
    console.error("❌ Error updating:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete
exports.deleteCropCalendar = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await CropCalendar.getCropCalendarById(id);

    if (!existing) return res.status(404).json({ message: "Not found" });

    const result = await CropCalendar.deleteCropCalendar(id);
    res.json(result);
  } catch (err) {
    console.error("❌ Error deleting:", err);
    res.status(500).json({ message: "Server error" });
  }
};