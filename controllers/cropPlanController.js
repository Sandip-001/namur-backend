// controllers/cropPlanController.js
const CropPlan = require("../models/cropPlanModel");
const pool = require("../config/db");

// Assumptions about other tables:
// - lands (id, name, farm_size, user_id)
// - products (id, name, image_url)
// We'll query lands to validate farm_size and ownership.

async function getLandById(land_id) {
  const { rows } = await pool.query(`SELECT * FROM lands WHERE id=$1`, [
    land_id,
  ]);
  return rows[0];
}

exports.createCropPlan = async (req, res) => {
  try {
    const { user_id, land_id, product_id, area_acres, planning_date } =
      req.body;

    // basic validations
    if (
      !user_id ||
      !land_id ||
      !product_id ||
      area_acres === undefined ||
      !planning_date
    ) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const area = Number(area_acres);
    if (isNaN(area) || area <= 0) {
      return res
        .status(400)
        .json({ message: "area_acres must be a positive number" });
    }

    // check land exists & ownership
    const land = await getLandById(land_id);
    if (!land) return res.status(404).json({ message: "Land not found" });

    // ensure land belongs to user (if your logic requires that)
    if (parseInt(land.user_id, 10) !== parseInt(user_id, 10)) {
      return res
        .status(403)
        .json({ message: "Selected land does not belong to this user" });
    }

    // ensure product not already under same land
    const exists = await CropPlan.existsProductUnderLand({
      land_id,
      product_id,
    });
    if (exists) {
      return res
        .status(409)
        .json({
          message: "This product already planned for the selected land",
        });
    }

    // ensure total area won't exceed farm_size
    const currentTotal = await CropPlan.getTotalAreaForLand(land_id);
    const newTotal = Number(currentTotal) + area;
    const farmSize = Number(land.farm_size);
    if (newTotal > farmSize) {
      return res.status(400).json({
        message: `Total planned area (${newTotal}) exceeds land farm_size (${farmSize}).`,
      });
    }

    // Validate planning_date format YYYY-MM-DD only
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(planning_date)) {
      return res
        .status(400)
        .json({ message: "Invalid planning_date format. Use YYYY-MM-DD" });
    }

    // create
    const created = await CropPlan.createCropPlan({
      user_id,
      land_id,
      product_id,
      area_acres: area,
      planning_date, // expect YYYY-MM-DD
    });

    res.status(201).json({ message: "Crop plan created", cropPlan: created });
  } catch (err) {
    console.error("createCropPlan error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getCropPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const cp = await CropPlan.getCropPlanById(id);
    if (!cp) return res.status(404).json({ message: "Not found" });
    res.json(cp);
  } catch (err) {
    console.error("getCropPlanById error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getCropPlansByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const list = await CropPlan.getCropPlansByUser(user_id);
    res.json(list);
  } catch (err) {
    console.error("getCropPlansByUser error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateCropPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await CropPlan.getCropPlanById(id);
    if (!existing)
      return res.status(404).json({ message: "Crop plan not found" });

    const {
      user_id = existing.user_id,
      land_id = existing.land_id,
      product_id = existing.product_id,
      area_acres = existing.area_acres,
      planning_date = existing.planning_date,
    } = req.body;

    const area = Number(area_acres);
    if (isNaN(area) || area <= 0) {
      return res
        .status(400)
        .json({ message: "area_acres must be a positive number" });
    }

    // check land exists & ownership
    const land = await getLandById(land_id);
    if (!land) return res.status(404).json({ message: "Land not found" });
    if (parseInt(land.user_id, 10) !== parseInt(user_id, 10)) {
      return res
        .status(403)
        .json({ message: "Selected land does not belong to this user" });
    }

    // if changing product or land, ensure no duplicate product under same land (excluding current plan)
    if (product_id !== existing.product_id || land_id !== existing.land_id) {
      const { rows } = await pool.query(
        `SELECT 1 FROM crop_plans WHERE land_id=$1 AND product_id=$2 AND id != $3 LIMIT 1`,
        [land_id, product_id, id]
      );
      if (rows.length > 0) {
        return res
          .status(409)
          .json({
            message: "This product already planned for the selected land",
          });
      }
    }

    // ensure sum of other plans + new area <= farm_size
    const otherTotal = await CropPlan.getTotalAreaForLandExcludingPlan(
      land_id,
      id
    );
    const newTotal = Number(otherTotal) + area;
    const farmSize = Number(land.farm_size);
    if (newTotal > farmSize) {
      return res.status(400).json({
        message: `Total planned area (${newTotal}) exceeds land farm_size (${farmSize}).`,
      });
    }

    // Validate planning_date format YYYY-MM-DD only
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(planning_date)) {
      return res
        .status(400)
        .json({ message: "Invalid planning_date format. Use YYYY-MM-DD" });
    }

    // update
    const updated = await CropPlan.updateCropPlan(id, {
      user_id,
      land_id,
      product_id,
      area_acres: area,
      planning_date,
    });

    res.json({ message: "Crop plan updated", cropPlan: updated });
  } catch (err) {
    console.error("updateCropPlan error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteCropPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await CropPlan.getCropPlanById(id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    await CropPlan.deleteCropPlan(id);
    res.json({ message: "Crop plan deleted" });
  } catch (err) {
    console.error("deleteCropPlan error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
