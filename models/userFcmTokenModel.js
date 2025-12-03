const pool = require("../config/db");

// Create table if not exists (keeps existing structure)
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `);
})();

const UserFcmToken = {
  async upsertToken(user_id, fcm_token) {
    // Insert if not exists, else ignore; we maintain unique token
    const q = `
      INSERT INTO user_fcm_tokens (user_id, fcm_token)
      VALUES ($1, $2)
      ON CONFLICT (fcm_token) DO UPDATE SET user_id = EXCLUDED.user_id, created_at = NOW()
      RETURNING *`;
    const res = await pool.query(q, [user_id, fcm_token]);
    return res.rows[0];
  },

  async deleteToken(fcm_token) {
    await pool.query("DELETE FROM user_fcm_tokens WHERE fcm_token=$1", [
      fcm_token,
    ]);
  },

  async getAllTokens() {
    const res = await pool.query("SELECT fcm_token FROM user_fcm_tokens");
    return res.rows.map((r) => r.fcm_token);
  },

  async getTokensByUserIds(userIds = []) {
    if (!userIds.length) return [];
    const params = userIds;
    const idxs = params.map((_, i) => `$${i + 1}`).join(",");
    const q = `SELECT fcm_token FROM user_fcm_tokens WHERE user_id IN (${idxs})`;
    const res = await pool.query(q, params);
    return res.rows.map((r) => r.fcm_token);
  },

  async getTokensByDistricts(districts = []) {
    if (!districts.length) return [];

    const q = `
    SELECT DISTINCT uft.fcm_token
    FROM user_fcm_tokens uft
    JOIN users u ON u.id = uft.user_id
    WHERE u.district = ANY($1)
  `;

    const res = await pool.query(q, [districts]);
    return res.rows.map((r) => r.fcm_token);
  },

  async getTokensForDistrictsAndProduct(districts = [], product_id) {
    // returns distinct tokens for users who match district(s) AND have land_products with product_id
    if (!districts.length || !product_id) return [];

    const q = `
      SELECT DISTINCT uft.fcm_token
      FROM users u
      JOIN land_products lp ON u.id = lp.user_id
      JOIN user_fcm_tokens uft ON u.id = uft.user_id
      WHERE u.district = ANY($1) AND lp.product_id = $2
    `;
    const res = await pool.query(q, [districts, product_id]);
    return res.rows.map((r) => r.fcm_token);
  },
};

module.exports = UserFcmToken;
