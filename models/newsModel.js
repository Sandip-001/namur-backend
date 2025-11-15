const pool = require("../config/db");

const News = {
  async createNews(title, url, imageUrl = null) {
    let query, values;

    if (imageUrl) {
      query = "INSERT INTO news (title, url, image) VALUES ($1, $2, $3) RETURNING *";
      values = [title, url, imageUrl];
    } else {
      query = "INSERT INTO news (title, url) VALUES ($1, $2) RETURNING *";
      values = [title, url];
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getNews() {
    const result = await pool.query("SELECT * FROM news ORDER BY id DESC");
    return result.rows;
  },

  async getNewsById(id) {
    const result = await pool.query("SELECT * FROM news WHERE id=$1", [id]);
    return result.rows[0];
  },

  async updateNews(id, title, url, imageUrl = null) {
    let query, values;

    if (imageUrl) {
      query = "UPDATE news SET title=$1, url=$2, image=$3 WHERE id=$4 RETURNING *";
      values = [title, url, imageUrl, id];
    } else {
      query = "UPDATE news SET title=$1, url=$2 WHERE id=$3 RETURNING *";
      values = [title, url, id];
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async deleteNews(id) {
    await pool.query("DELETE FROM news WHERE id=$1", [id]);
    return { message: "News deleted successfully" };
  },
};

module.exports = News;
