const pool = require("../config/db");

// Create Subcategory table if not exists
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id SERIAL PRIMARY KEY,
      category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

const Subcategory = {
  async createSubcategory(category_id, name) {
    const result = await pool.query(
      "INSERT INTO subcategories (category_id, name) VALUES ($1, $2) RETURNING *",
      [category_id, name]
    );
    return result.rows[0];
  },

  async getSubcategories() {
    const result = await pool.query(`
      SELECT s.id, s.name, s.category_id, c.name AS category_name, s.created_at
      FROM subcategories s
      JOIN categories c ON s.category_id = c.id
      ORDER BY s.id DESC
    `);
    return result.rows;
  },

  async getSubcategoriesByCategoryId(category_id) {
    const result = await pool.query(
      `SELECT s.id, s.name, s.category_id, c.name AS category_name, s.created_at
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       WHERE s.category_id = $1
       ORDER BY s.id DESC`,
      [category_id]
    );
    return result.rows;
  },

  async getSubcategoryById(id) {
    const result = await pool.query("SELECT * FROM subcategories WHERE id=$1", [id]);
    return result.rows[0];
  },

  async updateSubcategory(id, name, category_id) {
    // Fetch existing data
    const existing = await this.getSubcategoryById(id);
    if (!existing) throw new Error("Subcategory not found");

    const updatedName = name || existing.name;
    const updatedCategoryId = category_id || existing.category_id;

    const result = await pool.query(
      "UPDATE subcategories SET name=$1, category_id=$2 WHERE id=$3 RETURNING *",
      [updatedName, updatedCategoryId, id]
    );
    return result.rows[0];
  },

  async deleteSubcategory(id) {
    await pool.query("DELETE FROM subcategories WHERE id=$1", [id]);
    return { message: "Subcategory deleted successfully" };
  },
};

module.exports = Subcategory;