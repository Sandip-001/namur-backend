// models/cropPlanModel.js
const pool = require("../config/db");

// Ensure table exists
(async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crop_plans (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        land_id INT NOT NULL,
        product_id INT NOT NULL,
        area_acres NUMERIC NOT NULL,
        planning_date VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✔ crop_plans table ensured");
  } catch (err) {
    console.error("❌ Error ensuring crop_plans table:", err);
  }
})();


const CropPlan = {
  async createCropPlan({ user_id, land_id, product_id, area_acres, planning_date }) {
    const result = await pool.query(
      `INSERT INTO crop_plans
        (user_id, land_id, product_id, area_acres, planning_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user_id, land_id, product_id, area_acres, planning_date]
    );
    return result.rows[0];
  },

  async getCropPlanById(id) {
    const result = await pool.query(
      `SELECT cp.*,
              l.land_name AS land_name,
              l.farm_size AS land_farm_size,
              p.name AS product_name,
              p.image_url AS product_image
       FROM crop_plans cp
       LEFT JOIN lands l ON cp.land_id = l.id
       LEFT JOIN products p ON cp.product_id = p.id
       WHERE cp.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async getCropPlansByUser(user_id) {
    const result = await pool.query(
      `SELECT cp.*,
              l.land_name AS land_name,
              l.farm_size AS land_farm_size,
              p.name AS product_name,
              p.image_url AS product_image
       FROM crop_plans cp
       LEFT JOIN lands l ON cp.land_id = l.id
       LEFT JOIN products p ON cp.product_id = p.id
       WHERE cp.user_id = $1
       ORDER BY cp.id DESC`,
      [user_id]
    );
    return result.rows;
  },

  async getTotalAreaForLand(land_id) {
    const result = await pool.query(
      `SELECT COALESCE(SUM(area_acres), 0)::numeric AS total FROM crop_plans WHERE land_id = $1`,
      [land_id]
    );
    return result.rows[0]?.total ?? 0;
  },

  async getTotalAreaForLandExcludingPlan(land_id, excludePlanId) {
    const result = await pool.query(
      `SELECT COALESCE(SUM(area_acres), 0)::numeric AS total
       FROM crop_plans
       WHERE land_id = $1 AND id != $2`,
      [land_id, excludePlanId]
    );
    return result.rows[0]?.total ?? 0;
  },

  async existsProductUnderLand({ land_id, product_id }) {
    const result = await pool.query(
      `SELECT 1 FROM crop_plans WHERE land_id=$1 AND product_id=$2 LIMIT 1`,
      [land_id, product_id]
    );
    return result.rowCount > 0;
  },

  async updateCropPlan(id, data) {
    const {
      user_id,
      land_id,
      product_id,
      area_acres,
      planning_date,
    } = data;

    const result = await pool.query(
      `UPDATE crop_plans SET
         user_id = $1,
         land_id = $2,
         product_id = $3,
         area_acres = $4,
         planning_date = $5,
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [user_id, land_id, product_id, area_acres, planning_date, id]
    );

    return result.rows[0];
  },

  async deleteCropPlan(id) {
    await pool.query(`DELETE FROM crop_plans WHERE id=$1`, [id]);
    return { message: "Crop plan deleted successfully" };
  },
};

module.exports = CropPlan;