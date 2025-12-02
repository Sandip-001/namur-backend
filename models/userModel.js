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

function calculateProfileProgress(user) {
  let progress = 0;

  const basicFields = [
    "email",
    "username",
    "mobile",
    "district",
    "profession",
    "age",
  ];
  const filledBasic = basicFields.filter((f) => user[f]).length;
  if (filledBasic === basicFields.length) progress = 25;

  if (user.taluk && user.village && user.panchayat) progress = 50;
  if (parseInt(user.land_count) > 0) progress = 75;
  if (parseInt(user.land_product_count) > 0) progress = 100;

  return { ...user, profile_progress: progress };
}

const User = {
  // save firebase user on first login. client can pass username and profile_image_url (Google image)
  async findOrCreate(
    firebase_uid,
    email,
    username = null,
    profile_image_url = null
  ) {
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
    const result = await pool.query(
      `
    SELECT 
      u.*,
      COUNT(DISTINCT l.id) AS land_count,
      COUNT(DISTINCT lp.id) AS land_product_count
    FROM users u
    LEFT JOIN lands l ON u.id = l.user_id
    LEFT JOIN land_products lp ON u.id = lp.user_id
    WHERE u.id=$1
    GROUP BY u.id
  `,
      [id]
    );

    const user = result.rows[0];
    if (!user) return null;

    return calculateProfileProgress(user);
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
    const result = await pool.query(`
    SELECT 
      u.*,
      COUNT(DISTINCT l.id) AS land_count,
      COUNT(DISTINCT lp.id) AS land_product_count
    FROM users u
    LEFT JOIN lands l ON u.id = l.user_id
    LEFT JOIN land_products lp ON u.id = lp.user_id
    GROUP BY u.id
    ORDER BY u.id DESC
  `);

    return result.rows.map((user) => {
      let progress = 0;

      // Step 1 — Basic details
      const basicFields = [
        "email",
        "username",
        "mobile",
        "district",
        "profession",
        "age",
      ];
      const filledBasic = basicFields.filter((f) => user[f]).length;
      if (filledBasic === basicFields.length) progress = 25;

      // Step 2 — Location
      if (user.taluk && user.village && user.panchayat) progress = 50;

      // Step 3 — Has land
      if (parseInt(user.land_count) > 0) progress = 75;

      // Step 4 — Has land products
      if (parseInt(user.land_product_count) > 0) progress = 100;

      return { ...user, profile_progress: progress };
    });
  },

  // user side
  async getUser(firebase_uid) {
    const result = await pool.query(
      `
    SELECT 
      u.*,
      COUNT(DISTINCT l.id) AS land_count,
      COUNT(DISTINCT lp.id) AS land_product_count
    FROM users u
    LEFT JOIN lands l ON u.id = l.user_id
    LEFT JOIN land_products lp ON u.id = lp.user_id
    WHERE u.firebase_uid=$1
    GROUP BY u.id
  `,
      [firebase_uid]
    );

    const user = result.rows[0];
    if (!user) return null;

    return calculateProfileProgress(user);
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

  async updateUserById(id, data) {
    const fields = [];
    const values = [];
    let index = 1;

    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        fields.push(`${key}=$${index}`);
        values.push(data[key]);
        index++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id=$${index} RETURNING *`,
      values
    );

    return result.rows[0];
  },
};

module.exports = User;
