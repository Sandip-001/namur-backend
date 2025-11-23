const pool = require("../config/db");

// Create table
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS land_products (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      land_id INT NOT NULL REFERENCES lands(id) ON DELETE CASCADE,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      category VARCHAR(50) NOT NULL,

      -- Food fields
      acres DECIMAL(10,2),

      -- Machinery fields
      model_no VARCHAR(150),
      registration_no VARCHAR(150),
      chassi_no VARCHAR(150),
      rc_copy_no VARCHAR(150),

      -- Animal fields
      quantity INT,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

const LandProduct = {
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);

    const query = `
      INSERT INTO land_products (${keys.join(",")})
      VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getById(id) {
    const result = await pool.query("SELECT * FROM land_products WHERE id=$1", [
      id,
    ]);
    return result.rows[0];
  },

  async getAllByLand(user_id, land_id, category_name = null) {
    let query = `
    SELECT 
      lp.*, 
      p.name AS product_name,
      p.image_url AS product_image_url,
      c.name AS category_name,
      l.land_name
    FROM land_products lp
    JOIN products p ON lp.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN lands l ON lp.land_id = l.id
    WHERE lp.user_id = $1 AND lp.land_id = $2
  `;

    let values = [user_id, land_id];

    // if category_name provided → apply filter
    if (category_name) {
      query += ` AND LOWER(c.name) = LOWER($3)`;
      values.push(category_name);
    }

    query += ` ORDER BY lp.id DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  },

  async getAllByUser(user_id, category_name = null) {
    let query = `
    SELECT 
      lp.*,
      p.name AS product_name,
      p.image_url AS product_image_url,
      c.name AS category_name,
      l.land_name 
    FROM land_products lp
    JOIN products p ON lp.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN lands l ON lp.land_id = l.id
    WHERE lp.user_id = $1
  `;

    const params = [user_id];

    if (category_name) {
      query += " AND c.name ILIKE $2";
      params.push(category_name);
    }

    query += " ORDER BY lp.id DESC";

    const result = await pool.query(query, params);
    return result.rows;
  },

  async exists(user_id, land_id, product_id) {
    const result = await pool.query(
      `SELECT id FROM land_products 
     WHERE user_id=$1 AND land_id=$2 AND product_id=$3`,
      [user_id, land_id, product_id]
    );
    return result.rows.length > 0;
  },

  async getTotalFoodAcres(user_id, land_id, excludeId = null) {
    let query = `
    SELECT COALESCE(SUM(acres), 0) AS total
    FROM land_products
    WHERE user_id = $1 AND land_id = $2 AND category = 'Food'
  `;

    const params = [user_id, land_id];

    if (excludeId) {
      query += " AND id != $3";
      params.push(excludeId);
    }

    const result = await pool.query(query, params);
    return Number(result.rows[0].total) || 0;
  },

  async update(id, data) {
    const fields = Object.entries(data).filter(
      ([key, value]) => value !== undefined
    );

    if (fields.length === 0) throw new Error("No fields to update");

    const setQuery = fields.map(([key], i) => `${key}=$${i + 1}`).join(", ");

    const values = fields.map(([_, value]) => value);

    const result = await pool.query(
      `UPDATE land_products SET ${setQuery} WHERE id=$${
        fields.length + 1
      } RETURNING *`,
      [...values, id]
    );

    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query(
      "DELETE FROM land_products WHERE id=$1 RETURNING *",
      [id]
    );
    return result.rows[0];
  },
};

module.exports = LandProduct;
