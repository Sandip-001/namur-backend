const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// Create subadmins table if not exists
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subadmins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      number VARCHAR(20),
      qualification VARCHAR(150),
      address TEXT,
      districts TEXT,      -- comma-separated
      page_access TEXT,    -- comma-separated
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

const Subadmin = {
  async createSubadmin({ name, email, password, number, qualification, address, districts, page_access, image_url }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO subadmins (name, email, password, number, qualification, address, districts, page_access, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, name, email, number, qualification, address, districts, page_access, image_url, created_at`,
      [
        name,
        email,
        hashedPassword,
        number || "",
        qualification || "",
        address || "",
        districts || "",
        page_access || "",
        image_url || ""
      ]
    );
    return result.rows[0];
  },

  async getSubadmins() {
    const result = await pool.query(
      `SELECT id, name, email, number, qualification, address, districts, page_access, image_url, created_at 
       FROM subadmins ORDER BY id DESC`
    );
    return result.rows;
  },

  async getSubadminById(id) {
    const result = await pool.query(
      `SELECT id, name, email, number, qualification, address, districts, page_access, image_url, created_at
       FROM subadmins WHERE id=$1`,
      [id]
    );
    return result.rows[0];
  },

  // ✅ Add this
  async getSubadminByEmail(email) {
    const result = await pool.query(
      `SELECT * FROM subadmins WHERE email=$1`,
      [email]
    );
    return result.rows[0];
  },

  async updateSubadmin(id, { name, email, number, qualification, address, districts, page_access, image_url }) {
    const result = await pool.query(
      `UPDATE subadmins 
       SET name=$1, email=$2, number=$3, qualification=$4, address=$5, districts=$6, page_access=$7, image_url=$8
       WHERE id=$9
       RETURNING id, name, email, number, qualification, address, districts, page_access, image_url, created_at`,
      [name, email, number, qualification, address, districts, page_access, image_url, id]
    );
    return result.rows[0];
  },

  async deleteSubadmin(id) {
    await pool.query(`DELETE FROM subadmins WHERE id=$1`, [id]);
    return { message: "Subadmin deleted successfully" };
  }
};

module.exports = Subadmin;
