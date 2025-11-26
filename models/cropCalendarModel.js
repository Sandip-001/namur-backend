const pool = require("../config/db");

// Ensure table exists
(async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crop_calendars (
        id SERIAL PRIMARY KEY,
        sub_category_id INT NOT NULL,
        product_id INT NOT NULL,
        crop_details TEXT,
        cost_estimate JSONB DEFAULT '[]',
        cultivation_tips JSONB DEFAULT '[]',
        paste_and_diseases JSONB DEFAULT '[]',
        stages_selection JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✔ crop_calendars table ensured");
  } catch (err) {
    console.error("❌ Error ensuring crop_calendars table:", err);
  }
})();

const CropCalendar = {
  // Create Crop Calendar
  async createCropCalendar(data) {
    const {
      sub_category_id,
      product_id,
      crop_details,
      cost_estimate,
      cultivation_tips,
      paste_and_diseases,
      stages_selection,
    } = data;

    const result = await pool.query(
      `INSERT INTO crop_calendars 
        (sub_category_id, product_id, crop_details, cost_estimate,
         cultivation_tips, paste_and_diseases, stages_selection)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        sub_category_id,
        product_id,
        crop_details,
        JSON.stringify(cost_estimate || []),
        JSON.stringify(cultivation_tips || []),
        JSON.stringify(paste_and_diseases || []),
        JSON.stringify(stages_selection || []),
      ]
    );

    return result.rows[0];
  },

  async getCropCalendars() {
    const result = await pool.query(`
    SELECT cc.*,
      sc.name AS sub_category_name,
      p.name AS product_name
    FROM crop_calendars cc
    LEFT JOIN subcategories sc ON cc.sub_category_id = sc.id
    LEFT JOIN products p ON cc.product_id = p.id
    ORDER BY cc.id DESC
  `);
    return result.rows;
  },

  async getCropCalendarById(id) {
    const result = await pool.query(
      `SELECT * FROM crop_calendars WHERE id=$1`,
      [id]
    );
    return result.rows[0];
  },

  async getCropCalendarByProductId(product_id) {
    const result = await pool.query(
      `
    SELECT cc.*,
      sc.name AS sub_category_name,
      p.name AS product_name
    FROM crop_calendars cc
    LEFT JOIN subcategories sc ON cc.sub_category_id = sc.id
    LEFT JOIN products p ON cc.product_id = p.id
    WHERE cc.product_id=$1
  `,
      [product_id]
    );
    return result.rows;
  },

  async updateCropCalendar(id, data) {
    const {
      sub_category_id,
      product_id,
      crop_details,
      cost_estimate,
      cultivation_tips,
      paste_and_diseases,
      stages_selection,
    } = data;

    const result = await pool.query(
      `UPDATE crop_calendars SET
        sub_category_id=$1,
        product_id=$2,
        crop_details=$3,
        cost_estimate=$4,
        cultivation_tips=$5,
        paste_and_diseases=$6,
        stages_selection=$7,
        updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [
        sub_category_id,
        product_id,
        crop_details,
        JSON.stringify(cost_estimate || []),
        JSON.stringify(cultivation_tips || []),
        JSON.stringify(paste_and_diseases || []),
        JSON.stringify(stages_selection || []),
        id,
      ]
    );

    return result.rows[0];
  },

  async deleteCropCalendar(id) {
    await pool.query(`DELETE FROM crop_calendars WHERE id=$1`, [id]);
    return { message: "Crop calendar deleted successfully" };
  },
};

module.exports = CropCalendar;
