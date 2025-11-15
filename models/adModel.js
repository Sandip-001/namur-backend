const pool = require("../config/db");

const Ad = {
  async createAd(adData) {
    const {
      title,
      sub_category,
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
      created_by,
      creator_id,
    } = adData;

    const result = await pool.query(
      `INSERT INTO ads 
        (title, sub_category, product_id, product_name, unit, quantity, price, description, districts, ad_type, post_type, scheduled_at, expiry_date, images, created_by, creator_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) 
       RETURNING *`,
      [
        title,
        sub_category,
        product_id,
        product_name,
        unit,
        quantity,
        price,
        description,
        districts.join(","), // store as comma-separated
        ad_type,
        post_type,
        scheduled_at,
        expiry_date,
        images,              // array of image URLs
        created_by,
        creator_id,
      ]
    );
    return result.rows[0];
  },

  async getAds() {
    const result = await pool.query(`
      SELECT * FROM ads
      ORDER BY id DESC
    `);
    return result.rows;
  },

  async getAdById(id) {
    const result = await pool.query(`SELECT * FROM ads WHERE id=$1`, [id]);
    return result.rows[0];
  },

  async updateAd(id, adData) {
    const {
      title,
      sub_category,
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
    } = adData;

    const result = await pool.query(
      `UPDATE ads SET
        title=$1, sub_category=$2, product_id=$3, product_name=$4, unit=$5, quantity=$6, price=$7, description=$8,
        districts=$9, ad_type=$10, post_type=$11, scheduled_at=$12, expiry_date=$13, images=$14
       WHERE id=$15
       RETURNING *`,
      [
        title,
        sub_category,
        product_id,
        product_name,
        unit,
        quantity,
        price,
        description,
        districts.join(","),
        ad_type,
        post_type,
        scheduled_at,
        expiry_date,
        images,
        id,
      ]
    );
    return result.rows[0];
  },

  async deleteAd(id) {
    await pool.query(`DELETE FROM ads WHERE id=$1`, [id]);
    return { message: "Ad deleted successfully" };
  },
};

module.exports = Ad;
