// models/adLogsModel.js
const pool = require("../config/db");

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ad_logs (
      id SERIAL PRIMARY KEY,
      ad_id INT,
      action VARCHAR(50),        -- create | update | delete | auto_expired
      actor_name VARCHAR(255),
      actor_role VARCHAR(50),
      payload JSONB,             -- store relevant data snapshot
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
})();

const AdLogs = {
  async createLog({ ad_id, action, actor_name, actor_role, payload = null }) {
    const result = await pool.query(
      `INSERT INTO ad_logs (ad_id, action, actor_name, actor_role, payload)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [ad_id, action, actor_name, actor_role, payload ? payload : null]
    );
    return result.rows[0];
  },

  async getLogs() {
    const result = await pool.query(`
      SELECT * FROM ad_logs ORDER BY created_at DESC
    `);
    return result.rows;
  },
};

module.exports = AdLogs;