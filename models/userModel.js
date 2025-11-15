// models/userModel.js
const pool = require("../config/db");

// Create table if not exists (keeps existing structure)
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      firebase_uid VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      username VARCHAR(255),
      mobile VARCHAR(15),
      district VARCHAR(150),
      profession VARCHAR(150),
      age INT,
      taluk VARCHAR(150),
      village VARCHAR(150),
      panchayat VARCHAR(150),
      profile_image_url TEXT,
      profile_image_public_id TEXT,
      is_verified BOOLEAN DEFAULT false,
      is_blocked BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

const User = {
  // save firebase user on first login. client can pass username and profile_image_url (Google image)
  async findOrCreate(firebase_uid, email, username = null, profile_image_url = null) {
    let result = await pool.query("SELECT * FROM users WHERE firebase_uid=$1", [
      firebase_uid,
    ]);

    if (result.rowCount > 0) return result.rows[0];

    result = await pool.query(
      `INSERT INTO users (firebase_uid, email, username, profile_image_url) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [firebase_uid, email, username, profile_image_url]
    );

    return result.rows[0];
  },

  // admin
  async getUserById(id) {
    const result = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
    return result.rows[0];
  },

  async blockUser(id) {
    const result = await pool.query(
      "UPDATE users SET is_blocked=true WHERE id=$1 RETURNING *",
      [id]
    );
    return result.rows[0];
  },

  async unblockUser(id) {
    const result = await pool.query(
      "UPDATE users SET is_blocked=false WHERE id=$1 RETURNING *",
      [id]
    );
    return result.rows[0];
  },

  async getAllUsers() {
    const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
    return result.rows;
  },

  // user side
  async getUser(firebase_uid) {
    const result = await pool.query(
      "SELECT * FROM users WHERE firebase_uid=$1",
      [firebase_uid]
    );
    return result.rows[0];
  },

  // check mobile uniqueness (returns true if mobile taken by other firebase_uid)
  async isMobileTakenByOther(mobile, firebase_uid) {
    if (!mobile) return false;
    const result = await pool.query(
      "SELECT id FROM users WHERE mobile=$1 AND firebase_uid <> $2 LIMIT 1",
      [mobile, firebase_uid]
    );
    return result.rowCount > 0;
  },

  async updateBasicDetails(firebase_uid, mobile, district, profession, age) {
    const result = await pool.query(
      `UPDATE users SET mobile=$1, district=$2, profession=$3, age=$4 
       WHERE firebase_uid=$5 RETURNING *`,
      [mobile, district, profession, age, firebase_uid]
    );
    return result.rows[0];
  },

  async verifyOtp(firebase_uid) {
    const result = await pool.query(
      "UPDATE users SET is_verified=true WHERE firebase_uid=$1 RETURNING *",
      [firebase_uid]
    );
    return result.rows[0];
  },

  async updateAdditionalDetails(firebase_uid, taluk, village, panchayat) {
    const result = await pool.query(
      `UPDATE users SET taluk=$1, village=$2, panchayat=$3 
       WHERE firebase_uid=$4 RETURNING *`,
      [taluk, village, panchayat, firebase_uid]
    );
    return result.rows[0];
  },

  // update profile image (url + cloudinary public id)
  async updateProfileImage(firebase_uid, url, publicId) {
    const result = await pool.query(
      `UPDATE users SET profile_image_url=$1, profile_image_public_id=$2
       WHERE firebase_uid=$3 RETURNING *`,
      [url, publicId, firebase_uid]
    );
    return result.rows[0];
  },
};

module.exports = User;