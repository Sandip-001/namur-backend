// models/adModel.js
const pool = require("../config/db");
const { generateAdUID } = require("../helper/utils");

// Create ads table if not exists
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ads (
      id SERIAL PRIMARY KEY,
      ad_uid VARCHAR(20) UNIQUE,
      title VARCHAR(500) NOT NULL,
      category_id INT,
      subcategory_id INT,
      product_id INT,
      product_name VARCHAR(255),
      unit VARCHAR(50),
      quantity NUMERIC,
      price NUMERIC,
      districts TEXT[] DEFAULT '{}',
      description TEXT,
      ad_type VARCHAR(20),       -- rent | sell
      post_type VARCHAR(20),     -- postnow | schedule
      scheduled_at TIMESTAMP,    -- for scheduled posts (00:00)
      expiry_date TIMESTAMP,     -- when it should be removed (00:00)
      images JSONB DEFAULT '[]', -- array of { url, public_id }
      created_by_role VARCHAR(50), -- 'user'|'admin'|'subadmin'
      creator_id INT,
      extra_fields JSONB DEFAULT '{}', -- stores breed/unit/brand/model/year/etc
      status VARCHAR(20) DEFAULT 'pending', -- pending | active | expired
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
})();

const Ad = {
  async createAd(adData) {
    const {
      title,
      category_id,
      subcategory_id,
      product_id,
      product_name,
      unit,
      quantity,
      price,
      description,
      districts,
      ad_type,
      post_type,
      scheduled_at,
      expiry_date,
      images,
      created_by_role,
      creator_id,
      extra_fields,
      status,
    } = adData;

    const ad_uid = generateAdUID();

    const result = await pool.query(
      `INSERT INTO ads
    (title, category_id, subcategory_id, product_id, product_name, unit, quantity, price,
    description, districts, ad_type, post_type, scheduled_at, expiry_date, images,
    created_by_role, creator_id, extra_fields, status, ad_uid)
   VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
   RETURNING *`,
      [
        title,
        category_id,
        subcategory_id,
        product_id,
        product_name,
        unit,
        quantity,
        price,
        description,
        districts,
        ad_type,
        post_type,
        scheduled_at,
        expiry_date,
        JSON.stringify(images || []), // safe for JSONB
        created_by_role,
        creator_id,
        JSON.stringify(extra_fields || {}), // 🔥 **THIS FIXES THE ERROR**
        status || "pending",
        ad_uid,
      ]
    );

    return result.rows[0];
  },

  async getAds() {
    const result = await pool.query(`
    SELECT 
      a.*,
      
      CASE WHEN a.created_by_role = 'user' THEN u.username
           WHEN a.created_by_role = 'subadmin' THEN sa.name
           WHEN a.created_by_role = 'admin' THEN ad.name
      END AS creator_name,

      CASE WHEN a.created_by_role = 'user' THEN u.email
           WHEN a.created_by_role = 'subadmin' THEN sa.email
           WHEN a.created_by_role = 'admin' THEN ad.email
      END AS creator_email,

      CASE WHEN a.created_by_role = 'user' THEN u.mobile END AS user_mobile,
      CASE WHEN a.created_by_role = 'user' THEN u.district END AS user_district,
      CASE WHEN a.created_by_role = 'user' THEN u.taluk END AS user_taluk,
      CASE WHEN a.created_by_role = 'user' THEN u.village END AS user_village,
      CASE WHEN a.created_by_role = 'user' THEN u.panchayat END AS user_panchayat,
      CASE WHEN a.created_by_role = 'user' THEN u.profile_image_url END AS user_profile_image,

      CASE WHEN a.created_by_role = 'subadmin' THEN sa.number END AS subadmin_number,
      CASE WHEN a.created_by_role = 'subadmin' THEN sa.address END AS subadmin_address,
      CASE WHEN a.created_by_role = 'subadmin' THEN sa.districts END AS subadmin_districts,
      CASE WHEN a.created_by_role = 'subadmin' THEN sa.image_url END AS subadmin_image,

      CASE WHEN a.created_by_role = 'admin' THEN ad.name END AS admin_name,
      CASE WHEN a.created_by_role = 'admin' THEN ad.email END AS admin_email
      
    FROM ads a
    LEFT JOIN users u ON (a.created_by_role = 'user' AND a.creator_id = u.id)
    LEFT JOIN subadmins sa ON (a.created_by_role = 'subadmin' AND a.creator_id = sa.id)
    LEFT JOIN admins ad ON (a.created_by_role = 'admin' AND a.creator_id = ad.id)
    ORDER BY a.id DESC
  `);

    return result.rows;
  },

  async getAdById(id) {
    const result = await pool.query(`SELECT * FROM ads WHERE id=$1`, [id]);
    return result.rows[0];
  },

  async updateAd(id, adData) {
    const fields = [];
    const values = [];

    let index = 1;

    for (const [key, val] of Object.entries(adData)) {
      if (val === undefined) continue;

      // Convert JS array → TEXT[] for districts
      if (key === "districts" && Array.isArray(val)) {
        fields.push(`${key}=$${index++}`);
        values.push(`{${val.map((d) => `"${d}"`).join(",")}}`);
        continue;
      }

      // Convert JS array/object → JSONB
      if (key === "images" || key === "extra_fields") {
        fields.push(`${key}=$${index++}`);
        values.push(JSON.stringify(val));
        continue;
      }

      // normal fields
      fields.push(`${key}=$${index++}`);
      values.push(val);
    }

    const query = `UPDATE ads SET ${fields.join(
      ", "
    )} WHERE id=$${index} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async deleteAd(id) {
    const result = await pool.query(`DELETE FROM ads WHERE id=$1 RETURNING *`, [
      id,
    ]);
    return result.rows[0];
  },

  async getAdsWithFilters({
    productId,
    status,
    ad_type,
    districts = [],
    userType,
    userId,
  }) {
    let query = `
    SELECT 
      a.*,
      c.name AS category_name,
      sc.name AS subcategory_name,
      p.name AS product_name,

      CASE WHEN a.created_by_role = 'user' THEN u.username
           WHEN a.created_by_role = 'subadmin' THEN sa.name
           WHEN a.created_by_role = 'admin' THEN ad.name
      END AS creator_name,

      CASE WHEN a.created_by_role = 'user' THEN u.email
           WHEN a.created_by_role = 'subadmin' THEN sa.email
           WHEN a.created_by_role = 'admin' THEN ad.email
      END AS creator_email,

      u.mobile AS user_mobile,
      u.district AS user_district,
      u.taluk AS user_taluk,
      u.village AS user_village,
      u.panchayat AS user_panchayat,
      u.profile_image_url AS user_profile_image
    FROM ads a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN subcategories sc ON a.subcategory_id = sc.id
    LEFT JOIN products p ON a.product_id = p.id
    LEFT JOIN users u ON (a.created_by_role = 'user' AND a.creator_id = u.id)
    LEFT JOIN subadmins sa ON (a.created_by_role = 'subadmin' AND a.creator_id = sa.id)
    LEFT JOIN admins ad ON (a.created_by_role = 'admin' AND a.creator_id = ad.id)
    WHERE 1=1
  `;

    const params = [];
    let idx = 1;

    // ⭐ USER RESTRICTION FILTER — IMPORTANT
    if (userType && userId) {
      query += ` AND a.created_by_role = $${idx}`;
      params.push(userType);
      idx++;

      query += ` AND a.creator_id = $${idx}`;
      params.push(userId);
      idx++;
    }

    if (status) {
      query += ` AND a.status = $${idx}`;
      params.push(status);
      idx++;
    }

    if (productId) {
      query += ` AND a.product_id = $${idx}`;
      params.push(productId);
      idx++;
    }

    if (ad_type) {
      query += ` AND LOWER(a.ad_type) = LOWER($${idx})`;
      params.push(ad_type.toLowerCase());
      idx++;
    }

    if (districts.length) {
      query += ` AND (`;
      districts.forEach((d, i) => {
        query += `$${idx} = ANY(a.districts)`;
        params.push(d);
        idx++;
        if (i < districts.length - 1) query += " OR ";
      });
      query += ` )`;
    }

    query += ` ORDER BY a.id DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  // helper to mark as expired (could be used by scheduler)
  async markExpired(id) {
    const result = await pool.query(
      `UPDATE ads SET status='expired' WHERE id=$1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  // helper to activate
  async activateAd(id) {
    const result = await pool.query(
      `UPDATE ads SET status='active' WHERE id=$1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },
};

module.exports = Ad;
