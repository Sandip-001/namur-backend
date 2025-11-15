// db.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
  ssl: {
    rejectUnauthorized: false, // Render requires SSL
  },
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL connected successfully"))
  .catch(err => console.error("❌ PostgreSQL connection error:", err));

module.exports = pool;
