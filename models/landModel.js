const pool = require("../config/db");

// Create table automatically
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lands (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      land_name VARCHAR(200),
      district VARCHAR(150),
      taluk VARCHAR(150),
      village VARCHAR(150),
      panchayat VARCHAR(150),
      survey_no VARCHAR(150),
      hissa_no VARCHAR(150),
      farm_size DECIMAL(10,2),   -- supports 2.6 acres, 3.75 acres etc.
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

const Land = {
  async createLand(data) {
    const {
      user_id,
      land_name,
      district,
      taluk,
      village,
      panchayat,
      survey_no,
      hissa_no,
      farm_size,
    } = data;

    const result = await pool.query(
      `INSERT INTO lands 
      (user_id, land_name, district, taluk, village, panchayat, survey_no, hissa_no, farm_size)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        user_id,
        land_name,
        district,
        taluk,
        village,
        panchayat,
        survey_no,
        hissa_no,
        farm_size,
      ]
    );

    return result.rows[0];
  },

  async getAllLandsByUser(user_id) {
    const result = await pool.query(
      "SELECT * FROM lands WHERE user_id=$1 ORDER BY id DESC",
      [user_id]
    );
    return result.rows;
  },

  async getLandById(id) {
    const result = await pool.query("SELECT * FROM lands WHERE id=$1", [id]);
    return result.rows[0];
  },

  async updateLand(id, data) {
    // Remove undefined fields → update only provided values
    const fields = Object.entries(data).filter(
      ([key, value]) => value !== undefined
    );

    if (fields.length === 0) {
      throw new Error("No valid fields to update");
    }

    const setQuery = fields
      .map(([key], index) => `${key}=$${index + 1}`)
      .join(", ");

    const values = fields.map(([_, value]) => value);

    const result = await pool.query(
      `UPDATE lands SET ${setQuery} WHERE id=$${fields.length + 1} RETURNING *`,
      [...values, id]
    );

    return result.rows[0];
  },

  async deleteLand(id) {
    const result = await pool.query(
      "DELETE FROM lands WHERE id=$1 RETURNING *",
      [id]
    );
    return result.rows[0];
  },
};

module.exports = Land;