const Land = require("../models/landModel");
const User = require("../models/userModel");

// Helper to check if user is blocked
async function checkUserBlocked(user_id) {
  const user = await User.getUserById(user_id);
  if (!user) return { error: "User not found", blocked: true };

  if (user.is_blocked) {
    return { error: "User is blocked. Action not allowed.", blocked: true };
  }
  return { blocked: false, user };
}


// Create land
exports.createLand = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Check if blocked
    const check = await checkUserBlocked(user_id);
    if (check.blocked) return res.status(403).json({ message: check.error });

    const {
      land_name,
      district,
      taluk,
      village,
      panchayat,
      survey_no,
      hissa_no,
      farm_size,
    } = req.body;

    const land = await Land.createLand({
      user_id,
      land_name,
      district,
      taluk,
      village,
      panchayat,
      survey_no,
      hissa_no,
      farm_size,
    });

    res.json({ message: "Land added", land });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all lands of one user
exports.getUserLands = async (req, res) => {
  try {
    const { user_id } = req.params;

    const lands = await Land.getAllLandsByUser(user_id);

    res.json(lands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single land details
exports.getLand = async (req, res) => {
  try {
    const { id } = req.params;

    const land = await Land.getLandById(id);

    if (!land) return res.status(404).json({ message: "Land not found" });

    res.json(land);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit land details
exports.updateLand = async (req, res) => {
  try {
    const { id } = req.params;

    const land = await Land.getLandById(id);
    if (!land) return res.status(404).json({ message: "Land not found" });

    // Check if user is blocked
    const check = await checkUserBlocked(land.user_id);
    if (check.blocked) return res.status(403).json({ message: check.error });

    const updated = await Land.updateLand(id, req.body);

    res.json({ message: "Land updated", land: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete land
exports.deleteLand = async (req, res) => {
  try {
    const { id } = req.params;

    const land = await Land.getLandById(id);
    if (!land) return res.status(404).json({ message: "Land not found" });

    // Block check
    const check = await checkUserBlocked(land.user_id);
    if (check.blocked) return res.status(403).json({ message: check.error });

    const deleted = await Land.deleteLand(id);
    res.json({ message: "Land deleted", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};