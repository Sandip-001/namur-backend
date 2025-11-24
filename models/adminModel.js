const pool = require("../config/db");

// Create Admin Table if not exists
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

const AdminModel = {
  async createAdmin(name, email, password) {
    const result = await pool.query(
      `INSERT INTO admins (name, email, password) VALUES ($1, $2, $3) RETURNING *`,
      [name, email, password]
    );
    return result.rows[0];
  },

  async getAdmins() {
    const result = await pool.query(`SELECT id, name, email, created_at FROM admins`);
    return result.rows;
  },

  async getAdminByEmail(email) {
    const result = await pool.query(`SELECT * FROM admins WHERE email=$1`, [email]);
    return result.rows[0];
  },

  // ✅ NEW FUNCTION
  async getAdminById(id) {
    const result = await pool.query(`SELECT * FROM admins WHERE id=$1`, [id]);
    return result.rows[0];
  }
};

module.exports = AdminModel;
