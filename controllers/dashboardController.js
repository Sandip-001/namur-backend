const Admin = require("../models/adminModel");
const Subadmin = require("../models/subadminModel");
const Category = require("../models/categoryModel");
const Subcategory = require("../models/subcategoryModel");
const Product = require("../models/productModel");
const Ad = require("../models/adModel");

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const categories = await Category.getCategories();
    const subcategories = await Subcategory.getSubcategories();
    const products = await Product.getProducts();
    const ads = await Ad.getAds();   // ✅ fixed method name
    const admins = await Admin.getAdmins();
    const subadmins = await Subadmin.getSubadmins();

    res.json({
      totalCategories: categories.length,
      totalSubcategories: subcategories.length,
      totalProducts: products.length,
      totalAds: ads.length,
      totalAdmins: admins.length,
      totalSubadmins: subadmins.length,
    });
  } catch (err) {
    console.error("Error in getDashboardStats:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
