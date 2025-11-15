const pool = require("../config/db");

const NewsLog = {
  async createLog(newsId, action, oldData = null, newData = null) {
    const query = `
      INSERT INTO news_logs (news_id, action, old_data, new_data)
      VALUES ($1, $2, $3, $4)
      RETURNING *`;
    const values = [
      newsId,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getLogs() {
    const result = await pool.query(
      "SELECT * FROM news_logs ORDER BY id DESC"
    );
    return result.rows;
  },
};

module.exports = NewsLog;
