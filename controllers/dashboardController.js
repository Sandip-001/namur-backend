const pool = require("../config/db");

exports.getDashboardStats = async (req, res) => {
  try {
    const usersCountQuery = pool.query("SELECT COUNT(*) AS total FROM users");
    const adsCountQuery = pool.query("SELECT COUNT(*) AS total FROM ads");
    const productsCountQuery = pool.query("SELECT COUNT(*) AS total FROM products");
    const newsCountQuery = pool.query("SELECT COUNT(*) AS total FROM news");

    const results = await Promise.all([
      usersCountQuery,
      adsCountQuery,
      productsCountQuery,
      newsCountQuery,
    ]);

    return res.json({
      totalUsers: Number(results[0].rows[0].total),
      totalAds: Number(results[1].rows[0].total),
      totalProducts: Number(results[2].rows[0].total),
      totalNews: Number(results[3].rows[0].total),
    });
  } catch (err) {
    console.error("🔥 Dashboard Stats Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};