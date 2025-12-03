// models/productEnquiryModel.js
const pool = require("../config/db");

// Create table if not exists
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_enquiries (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      breed VARCHAR(255),
      enquiry_type VARCHAR(20) CHECK (enquiry_type IN ('buy', 'rent')),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
})();

const ProductEnquiry = {
  async createEnquiry({
    user_id,
    product_id,
    breed,
    enquiry_type,
    description,
  }) {
    const result = await pool.query(
      `INSERT INTO product_enquiries (user_id, product_id, breed, enquiry_type, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [user_id, product_id, breed, enquiry_type, description]
    );
    return result.rows[0];
  },

  async getEnquiries() {
    const result = await pool.query(`
    SELECT 
      e.*,
      -- User Details
      u.username AS user_name,
      u.email AS user_email,
      u.mobile AS user_mobile,
      u.profession AS user_profession,
      u.age AS user_age,
      u.district AS user_district,
      u.taluk AS user_taluk,
      u.village AS user_village,
      u.panchayat AS user_panchayat,
      u.profile_image_url AS user_profile_image,

      -- Product Details
      p.name AS product_name,
      p.image_url AS product_image,

      -- Category & Subcategory
      c.id AS category_id,
      c.name AS category_name,
      s.id AS subcategory_id,
      s.name AS subcategory_name

    FROM product_enquiries e
    JOIN users u ON e.user_id = u.id
    JOIN products p ON e.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN subcategories s ON p.subcategory_id = s.id
    ORDER BY e.id DESC;
  `);
    return result.rows;
  },

  async deleteEnquiry(id) {
    await pool.query(`DELETE FROM product_enquiries WHERE id = $1`, [id]);
    return { message: "Enquiry deleted successfully" };
  },

  // Add this function to ProductEnquiry
  async getEnquiryById(id) {
    const result = await pool.query(
      `SELECT 
       e.*,
       u.username AS user_name,
       u.email AS user_email,
       u.mobile AS user_mobile,
       p.name AS product_name,
       p.image_url AS product_image,
       c.id AS category_id,
       c.name AS category_name,
       s.id AS subcategory_id,
       s.name AS subcategory_name
     FROM product_enquiries e
     JOIN users u ON e.user_id = u.id
     JOIN products p ON e.product_id = p.id
     JOIN categories c ON p.category_id = c.id
     JOIN subcategories s ON p.subcategory_id = s.id
     WHERE e.id = $1
     LIMIT 1;`,
      [id]
    );
    return result.rows[0] || null;
  },

  async updateEnquiry(id, fields = {}) {
    const allowed = [
      "user_id",
      "product_id",
      "breed",
      "enquiry_type",
      "description",
    ];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }

    if (sets.length === 0) {
      return await this.getEnquiryById(id);
    }

    sets.push(`updated_at = NOW()`);

    const query = `
    UPDATE product_enquiries
    SET ${sets.join(", ")}
    WHERE id = $${idx}
    RETURNING *;
  `;
    values.push(id);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      console.log("❌ Update failed for ID:", id);
      return null;
    }

    return result.rows[0];
  },
};

module.exports = ProductEnquiry;