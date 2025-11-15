const pool = require("../config/db");

// Create category table with Cloudinary info
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      image_url TEXT,
      image_public_id TEXT
    )
  `);
})();


const Category = {
  async createCategory(name, imageUrl = null, publicId = null) {
    const query = `
      INSERT INTO categories (name, image_url, image_public_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [name, imageUrl, publicId]);
    return result.rows[0];
  },

  async getCategories() {
    const result = await pool.query("SELECT * FROM categories ORDER BY id DESC");
    return result.rows;
  },

  async getCategoryById(id) {
    const result = await pool.query("SELECT * FROM categories WHERE id=$1", [id]);
    return result.rows[0];
  },

  async updateCategory(id, name, imageUrl = null, publicId = null) {
    if (imageUrl && publicId) {
      const query = `
        UPDATE categories 
        SET name=$1, image_url=$2, image_public_id=$3 
        WHERE id=$4 RETURNING *
      `;
      const result = await pool.query(query, [name, imageUrl, publicId, id]);
      return result.rows[0];
    } else {
      const query = `
        UPDATE categories 
        SET name=$1 
        WHERE id=$2 RETURNING *
      `;
      const result = await pool.query(query, [name, id]);
      return result.rows[0];
    }
  },

  async deleteCategory(id) {
    const category = await this.getCategoryById(id);
    await pool.query("DELETE FROM categories WHERE id=$1", [id]);
    return category;
  },
};

module.exports = Category;
