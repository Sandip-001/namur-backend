// models/landMapModel.js
const pool = require("../config/db");

// Create table automatically without PostGIS
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS land_maps (
      id SERIAL PRIMARY KEY,
      district VARCHAR(150) NOT NULL,
      taluk VARCHAR(150) NOT NULL,
      hobli VARCHAR(150),
      village VARCHAR(150) NOT NULL,
      survey_no VARCHAR(100),
      hissa_no VARCHAR(100),
      fid_code VARCHAR(200),
      area_acres NUMERIC,
      geom_type VARCHAR(50),
      coords_latlng JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
})();

const LandMap = {
  async create(data) {
    const {
      district,
      taluk,
      hobli,
      village,
      survey_no,
      hissa_no,
      fid_code,
      area_acres,
      geom_type,
      coordsLatLng,
    } = data;

    const result = await pool.query(
      `INSERT INTO land_maps 
      (district, taluk, hobli, village, survey_no, hissa_no, fid_code, area_acres, geom_type, coords_latlng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        district,
        taluk,
        hobli || null,
        village,
        survey_no || null,
        hissa_no || null,
        fid_code || null,
        area_acres || null,
        geom_type || null,
        JSON.stringify(coordsLatLng),
      ]
    );

    return result.rows[0];
  },

  async existsByIdentity({ district, taluk, village, survey_no, hissa_no }) {
    const res = await pool.query(
      `SELECT id FROM land_maps
       WHERE district=$1 AND taluk=$2 AND village=$3 
       AND COALESCE(survey_no,'') = COALESCE($4,'')
       AND COALESCE(hissa_no,'') = COALESCE($5,'')
       LIMIT 1`,
      [district, taluk, village, survey_no || null, hissa_no || null]
    );
    return res.rows[0] ? res.rows[0].id : null;
  },

  async getAll() {
    const res = await pool.query(`SELECT * FROM land_maps ORDER BY id DESC`);
    return res.rows;
  },

  async deleteById(id) {
    await pool.query(`DELETE FROM land_maps WHERE id=$1`, [id]);
    return { message: "deleted" };
  },
};

module.exports = LandMap;