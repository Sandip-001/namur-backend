const pool = require("../config/db");

// ===============================
// AUTO CREATE news_logs TABLE (UTC safe)
// ===============================
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news_logs (
        id SERIAL PRIMARY KEY,
        news_id INTEGER,
        title VARCHAR(255),
        url TEXT,
        action VARCHAR(50),
        actor_name VARCHAR(255),
        actor_role VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✔ news_logs table ensured (UTC safe)");
  } catch (err) {
    console.error("❌ Error creating news_logs table:", err);
  }
})();

const NewsLog = {
  async createLog(newsId, title, url, action, actorName, actorRole) {
    const query = `
      INSERT INTO news_logs 
      (news_id, title, url, action, actor_name, actor_role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`;

    const values = [newsId, title, url, action, actorName, actorRole];
    const result = await pool.query(query, values);

    return result.rows[0];
  },

  async getLogs() {
    const result = await pool.query(
      `SELECT * FROM news_logs ORDER BY id DESC`
    );
    return result.rows;
  },
};

module.exports = NewsLog;