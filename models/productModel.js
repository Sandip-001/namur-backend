const pool = require("../config/db");

// Create Product table if not exists
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      image_url TEXT,
      image_public_id TEXT,
      category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      subcategory_id INT NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

const Product = {
  async createProduct(
    name,
    image_url,
    image_public_id,
    category_id,
    subcategory_id
  ) {
    const result = await pool.query(
      `INSERT INTO products (name, image_url, image_public_id, category_id, subcategory_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, image_url, image_public_id, category_id, subcategory_id]
    );
    return result.rows[0];
  },

  async getProducts() {
    const result = await pool.query(`
      SELECT p.id, p.name, p.image_url, p.category_id, c.name AS category_name,
             p.subcategory_id, s.name AS subcategory_name, p.created_at
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN subcategories s ON p.subcategory_id = s.id
      ORDER BY p.id DESC
    `);
    return result.rows;
  },

  async getProductById(id) {
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name, s.name AS subcategory_name
     FROM products p
     JOIN categories c ON p.category_id = c.id
     JOIN subcategories s ON p.subcategory_id = s.id
     WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async getProductsBySubcategory(subcategory_id) {
    const result = await pool.query(
      `SELECT p.id, p.name, p.image_url, p.category_id, c.name AS category_name,
            p.subcategory_id, s.name AS subcategory_name, p.created_at
     FROM products p
     JOIN categories c ON p.category_id = c.id
     JOIN subcategories s ON p.subcategory_id = s.id
     WHERE p.subcategory_id = $1
     ORDER BY p.id DESC`,
      [subcategory_id]
    );
    return result.rows;
  },

  async updateProduct(id, fields) {
    const existing = await this.getProductById(id);
    if (!existing) throw new Error("Product not found");

    const updated = {
      name: fields.name || existing.name,
      image_url: fields.image_url || existing.image_url,
      image_public_id: fields.image_public_id || existing.image_public_id,
      category_id: fields.category_id || existing.category_id,
      subcategory_id: fields.subcategory_id || existing.subcategory_id,
    };

    const result = await pool.query(
      `UPDATE products
       SET name=$1, image_url=$2, image_public_id=$3, category_id=$4, subcategory_id=$5
       WHERE id=$6 RETURNING *`,
      [
        updated.name,
        updated.image_url,
        updated.image_public_id,
        updated.category_id,
        updated.subcategory_id,
        id,
      ]
    );

    return result.rows[0];
  },

  async deleteProduct(id) {
    const product = await this.getProductById(id);
    await pool.query("DELETE FROM products WHERE id=$1", [id]);
    return product; // Return deleted product to remove from Cloudinary
  },
};

module.exports = Product;
