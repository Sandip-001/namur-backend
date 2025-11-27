const pool = require("../config/db");

// Create table if not exists (keeps existing structure)
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  created_by VARCHAR(150),        -- admin/subadmin 
  created_by_name VARCHAR(150),
  type VARCHAR(50) NOT NULL,      -- 'general' | 'targeted'
  target_info JSONB,              -- { districts: [...], product_id }
  recipients_count INT DEFAULT 0, -- how many tokens targeted
  payload JSONB,                  -- last request/payload stored as JSON
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `);
})();

const NotificationLog = {
  async createLog({ title, description, created_by, created_by_name, type, target_info, recipients_count, payload }) {
    const q = `
      INSERT INTO notification_logs
      (title, description, created_by, created_by_name, type, target_info, recipients_count, payload)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;
    const res = await pool.query(q, [
      title,
      description,
      created_by || null,
      created_by_name || null,
      type,
      JSON.stringify(target_info || {}),
      recipients_count || 0,
      JSON.stringify(payload || {}),
    ]);
    return res.rows[0];
  },

  async getLogs(limit = 50, offset = 0) {
    const res = await pool.query(
      `SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows;
  }
};

module.exports = NotificationLog;