const pool = require("../config/db");

// ===============================
// AUTO CREATE TABLE IF NOT EXISTS
// ===============================
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        image_url TEXT,
        image_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✔ news table ensured");
  } catch (err) {
    console.error("❌ Error creating news table:", err);
  }
})();

const News = {
  async createNews(title, url, imageUrl, imageId) {
    const result = await pool.query(
      `INSERT INTO news (title, url, image_url, image_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, url, imageUrl, imageId]
    );
    return result.rows[0];
  },

  async getNews() {
    const result = await pool.query(`SELECT * FROM news ORDER BY id DESC`);
    return result.rows;
  },

  async getNewsById(id) {
    const result = await pool.query(`SELECT * FROM news WHERE id=$1`, [id]);
    return result.rows[0];
  },

  async updateNews(id, data) {
    const existing = await pool.query(`SELECT * FROM news WHERE id=$1`, [id]);
    if (existing.rows.length === 0) return null;

    const old = existing.rows[0];

    const updated = await pool.query(
      `UPDATE news SET 
      title = $1,
      url = $2,
      image_url = $3,
      image_id = $4
     WHERE id = $5
     RETURNING *`,
      [
        data.title ?? old.title,
        data.url ?? old.url,
        data.image_url ?? old.image_url,
        data.image_id ?? old.image_id,
        id,
      ]
    );

    return updated.rows[0];
  },

  async deleteNews(id) {
    const result = await pool.query(
      `DELETE FROM news WHERE id=$1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },
};

module.exports = News;
