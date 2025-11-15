const pool = require("../config/db");

const AdLogs = {
  async createLog({ ad_id, product_name, unit, price, deleted_by, user_name }) {
    const result = await pool.query(
      `INSERT INTO ad_logs (ad_id, product_name, unit, price, deleted_by, user_name)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [ad_id, product_name, unit, price, deleted_by, user_name]
    );
    return result.rows[0];
  },

  async getLogs() {
    const result = await pool.query(`
      SELECT * FROM ad_logs
      ORDER BY deleted_at DESC
    `);
    return result.rows;
  },
};

module.exports = AdLogs;
