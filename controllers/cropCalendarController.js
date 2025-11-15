const CropCalendar = require("../models/cropCalendarModel");

// Create
exports.createCropCalendar = async (req, res) => {
  try {
    const {
      sub_category,
      product,
      crop_details,
      cultivation_tips,
      paste_and_diseases,
      stages_selection,
    } = req.body;

    if (!sub_category || !product) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const cropCalendar = await CropCalendar.createCropCalendar({
      sub_category,
      product,
      crop_details,
      cultivation_tips,
      paste_and_diseases,
      stages_selection,
    });

    res.status(201).json({ message: "Crop calendar created", cropCalendar });
  } catch (err) {
    console.error("❌ Error creating crop calendar:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all
exports.getCropCalendars = async (req, res) => {
  try {
    const data = await CropCalendar.getCropCalendars();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
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
      ...req.body, // overwrite only provided fields
    });

    res.json({ message: "Crop calendar updated", cropCalendar: updated });
  } catch (err) {
    console.error("❌ Error updating crop calendar:", err);
    res.status(500).json({ message: "Server error", error: err.message });
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
    console.error("❌ Error deleting crop calendar:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
