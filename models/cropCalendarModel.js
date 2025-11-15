const pool = require("../config/db");

const CropCalendar = {
  // Create Crop Calendar
  async createCropCalendar(data) {
    const {
      sub_category,
      product,
      crop_details,
      cultivation_tips, // already an array
      paste_and_diseases, // already an array
      stages_selection,   // already an array
    } = data;

    const result = await pool.query(
      `INSERT INTO crop_calendars 
        (sub_category, product, crop_details, cultivation_tips, paste_and_diseases, stages_selection) 
       VALUES ($1,$2,$3,$4,$5,$6) 
       RETURNING *`,
      [
        sub_category,
        product,
        crop_details,
        JSON.stringify(cultivation_tips || []),
        JSON.stringify(paste_and_diseases || []),
        JSON.stringify(stages_selection || []),
      ]
    );

    return result.rows[0];
  },

  async getCropCalendars() {
    const result = await pool.query(`SELECT * FROM crop_calendars ORDER BY id DESC`);
    return result.rows;
  },

  async getCropCalendarById(id) {
    const result = await pool.query(`SELECT * FROM crop_calendars WHERE id=$1`, [id]);
    return result.rows[0];
  },

  async updateCropCalendar(id, data) {
    const {
      sub_category,
      product,
      crop_details,
      cultivation_tips,
      paste_and_diseases,
      stages_selection,
    } = data;

    const result = await pool.query(
      `UPDATE crop_calendars SET
        sub_category=$1,
        product=$2,
        crop_details=$3,
        cultivation_tips=$4,
        paste_and_diseases=$5,
        stages_selection=$6,
        updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [
        sub_category,
        product,
        crop_details,
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
