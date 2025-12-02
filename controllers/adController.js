// controllers/adController.js
const Ad = require("../models/adModel");
const AdLogs = require("../models/AdLogs");
const User = require("../models/userModel");
const Admin = require("../models/adminModel");
const Subadmin = require("../models/subadminModel");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");
const Category = require("../models/categoryModel");
const { generateAdUID } = require("../helper/utils");
const pool = require("../config/db");

// multer memory
const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadMiddleware = upload.array("images", 10);

// helper: upload buffer -> cloudinary
const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "Namur_ads" },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    stream.end(buffer);
  });

// Create
exports.createAd = async (req, res) => {
  try {
    // fields from form-data (districts should be JSON array or comma-separated string)
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
      scheduled_at, // optional dd-mm-yyyy? => we expect ISO string or 'DD-MM-YYYY' we will parse
      expiry_date,
      created_by_role,
      creator_id,
      extra_fields, // optional JSON string
    } = req.body;

    // basic required
    if (
      !title ||
      !product_id ||
      !product_name ||
      !districts ||
      !ad_type ||
      !created_by_role ||
      !creator_id
    ) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const category = await Category.getCategoryById(category_id);
    if (!category) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // Validate creator based on role
    let creator = null;

    if (created_by_role === "user") {
      creator = await User.getUserById(Number(creator_id));
      if (!creator) return res.status(404).json({ message: "User not found" });
      if (creator.is_blocked)
        return res.status(403).json({ message: "User is blocked" });
    } else if (created_by_role === "subadmin") {
      creator = await Subadmin.getSubadminById(Number(creator_id));
      if (!creator)
        return res.status(404).json({ message: "Subadmin not found" });
    } else if (created_by_role === "admin") {
      creator = await Admin.getAdminById(Number(creator_id));
      if (!creator) return res.status(404).json({ message: "Admin not found" });
    } else {
      return res.status(400).json({ message: "Invalid created_by_role" });
    }

    // parse districts into array
    let districtsArr = [];
    if (typeof districts === "string") {
      try {
        districtsArr = JSON.parse(districts);
      } catch {
        districtsArr = districts.split(",").map((s) => s.trim());
      }
    }

    // Convert JS array → PostgreSQL TEXT[]
    let pgDistrictArray = `{${districtsArr.map((d) => `"${d}"`).join(",")}}`;

    // parse dates
    function parseToMidnight(dateString) {
      if (!dateString) return null;

      let parts = dateString.split("-");
      let yyyy, mm, dd;

      if (parts[0].length === 4) {
        // yyyy-mm-dd
        yyyy = parts[0];
        mm = parts[1];
        dd = parts[2];
      } else {
        // dd-mm-yyyy
        dd = parts[0];
        mm = parts[1];
        yyyy = parts[2];
      }

      return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    }

    // ------- Replace your parsing -------
    let scheduledAt = parseToMidnight(scheduled_at);
    let expiryAt = parseToMidnight(expiry_date);

    // determine initial status
    let status = "pending";
    if (post_type === "postnow") status = "active";

    // if postnow and no expiry_date provided, set expiry = created_at + 15 days
    const now = new Date();
    if (post_type === "postnow" && !expiryAt) {
      // Current IST time
      const nowIST = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );

      // Set to IST midnight
      nowIST.setHours(0, 0, 0, 0);

      // Add 15 days
      nowIST.setDate(nowIST.getDate() + 15);

      expiryAt = new Date(nowIST); // Save correct IST timestamp
    }

    // Validate category-specific required fields inside extra_fields
    let extra = {};
    if (extra_fields) {
      try {
        extra =
          typeof extra_fields === "string"
            ? JSON.parse(extra_fields)
            : extra_fields;
      } catch {
        extra = {};
      }
    }

    // ------------------------------------
    // CATEGORY BASED VALIDATION
    // ------------------------------------
    if (["Food", "Animal"].includes(category.name)) {
      if (!extra.breed || extra.breed.trim() === "") {
        return res
          .status(400)
          .json({ message: "Breed name is required for Food/Animal category" });
      }
      if (!unit) {
        return res
          .status(400)
          .json({ message: "Unit is required for Food/Animal category" });
      }
    }

    if (category.name === "Machinery") {
      const requiredMachineryFields = [
        "brand",
        "model",
        "manufacture_year",
        "registration_no",
        "prev_owners",
        "driven_hours",
        "kms_covered",
        "insurance_running",
        "fc_value",
      ];

      for (const field of requiredMachineryFields) {
        if (!extra[field]) {
          return res.status(400).json({
            message: `Missing required field for machinery: ${field}`,
          });
        }
      }
    }

    // handle images
    let imageObjs = [];
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const uploaded = await uploadToCloudinary(file.buffer);
        imageObjs.push({
          url: uploaded.secure_url,
          public_id: uploaded.public_id,
        });
      }
    }

    // create ad
    const ad = await Ad.createAd({
      title,
      category_id,
      subcategory_id,
      product_id,
      product_name,
      unit,
      quantity,
      price,
      description,
      districts: pgDistrictArray, // <-- FIXED
      ad_type,
      post_type,
      scheduled_at: scheduledAt,
      expiry_date: expiryAt,
      images: imageObjs,
      created_by_role,
      creator_id,
      extra_fields: extra,
      status,
    });

    // create log
    await AdLogs.createLog({
      ad_id: ad.id,
      action: "create",
      actor_name: req.body.actor_name || req.user?.name || null,
      actor_role: req.body.actor_role || req.user?.role || created_by_role,
      payload: ad,
    });

    res.status(201).json({ message: "Ad created", ad });
  } catch (err) {
    console.error("createAd error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET all ads
exports.getAds = async (req, res) => {
  try {
    const ads = await Ad.getAds();
    res.json(ads);
  } catch (err) {
    console.error("getAds:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET ad by id
exports.getAdById = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.getAdById(id);
    if (!ad) return res.status(404).json({ message: "Ad not found" });
    res.json(ad);
  } catch (err) {
    console.error("getAdById:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET ads by district(s) + optional filters
exports.filterAds = async (req, res) => {
  try {
    const { productId, status, ad_type, districts, userType, userId } =
      req.query;

    let districtsArr = [];
    if (districts) {
      try {
        districtsArr = JSON.parse(districts);
        if (!Array.isArray(districtsArr))
          districtsArr = districts.split(",").map((d) => d.trim());
      } catch {
        districtsArr = districts.split(",").map((d) => d.trim());
      }
    }

    const ads = await Ad.getAdsWithFilters({
      productId,
      status,
      ad_type,
      districts: districtsArr,
      userType,
      userId,
    });

    res.json(ads);
  } catch (err) {
    console.error("filterAds error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getRecentAdsByDistrict = async (req, res) => {
  try {
    const { district } = req.query;

    if (!district) {
      return res.status(400).json({
        error: "district query parameter is required"
      });
    }

    const result = await pool.query(`
      SELECT *
      FROM ads
      WHERE status='active'
      AND $1 = ANY (districts)   -- check district exists in array
      AND created_at >= NOW() - INTERVAL '48 HOURS'
      ORDER BY created_at DESC
    `, [district]);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching recent ads:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Update ad
exports.updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Ad.getAdById(id);
    if (!existing) return res.status(404).json({ message: "Ad not found" });

    if (!existing.ad_uid) {
      await Ad.updateAd(id, { ad_uid: generateAdUID() });
    }

    let currentImages = existing.images || [];

    if (typeof currentImages === "string") {
      try {
        currentImages = JSON.parse(currentImages);
      } catch {
        currentImages = [];
      }
    }

    if (!Array.isArray(currentImages)) {
      currentImages = [];
    }

    // Validate creator based on role
    let creator = null;

    if (existing.created_by_role === "user") {
      creator = await User.getUserById(Number(existing.creator_id));
      if (!creator) return res.status(404).json({ message: "User not found" });
      if (creator.is_blocked)
        return res.status(403).json({ message: "User is blocked" });
    } else if (existing.created_by_role === "subadmin") {
      creator = await Subadmin.getSubadminById(Number(existing.creator_id));
      if (!creator)
        return res.status(404).json({ message: "Subadmin not found" });
    } else if (existing.created_by_role === "admin") {
      creator = await Admin.getAdminById(Number(existing.creator_id));
      if (!creator) return res.status(404).json({ message: "Admin not found" });
    } else {
      return res.status(400).json({ message: "Invalid created_by_role" });
    }

    // collect incoming fields
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
      existingImages, // JSON array of public_ids to keep
      extra_fields,
    } = req.body;

    const category = await Category.getCategoryById(
      category_id ?? existing.category_id
    );
    if (!category) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // parse existingImages to array of public_ids (keep)
    let keepImages = [];
    if (existingImages) {
      try {
        keepImages = JSON.parse(existingImages);
        if (!Array.isArray(keepImages)) keepImages = [];
      } catch {
        keepImages = [];
      }
    }

    // delete images that are not in keepImages
    const imagesToRemove = currentImages.filter(
      (img) => !keepImages.includes(img.public_id)
    );
    for (const img of imagesToRemove) {
      if (img.public_id) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (e) {
          console.warn("Failed to delete image:", img.public_id, e.message);
        }
      }
    }

    // remaining images
    const remaining = currentImages.filter((img) =>
      keepImages.includes(img.public_id)
    );

    // upload new files and append
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const uploaded = await uploadToCloudinary(file.buffer);
        remaining.push({
          url: uploaded.secure_url,
          public_id: uploaded.public_id,
        });
      }
    }

    // parse districts
    let districtsArr = existing.districts || [];
    if (districts) {
      if (typeof districts === "string") {
        try {
          districtsArr = JSON.parse(districts);
          if (!Array.isArray(districtsArr))
            districtsArr = districts.split(",").map((s) => s.trim());
        } catch {
          districtsArr = districts.split(",").map((s) => s.trim());
        }
      } else if (Array.isArray(districts)) {
        districtsArr = districts;
      }
    }

    // parse extra_fields
    let extra = existing.extra_fields || {};
    if (extra_fields) {
      try {
        extra =
          typeof extra_fields === "string"
            ? JSON.parse(extra_fields)
            : extra_fields;
      } catch {}
    }

    // Validate Food/Animal
    if (["Food", "Animal"].includes(category.name)) {
      if (!extra.breed || extra.breed.trim() === "") {
        return res
          .status(400)
          .json({ message: "Breed is required for Food/Animal category" });
      }
      // Only require unit if it's missing BOTH in request & existing
      const finalUnit = unit ?? existing.unit;
      if (!finalUnit) {
        return res.status(400).json({ message: "Unit is required" });
      }
    }

    // Validate Machinery
    if (category.name === "Machinery") {
      const requiredMachineryFields = [
        "brand",
        "model",
        "manufacture_year",
        "registration_no",
        "prev_owners",
        "driven_hours",
        "kms_covered",
        "insurance_running",
        "fc_value",
      ];

      for (const field of requiredMachineryFields) {
        if (!extra[field]) {
          return res.status(400).json({
            message: `Missing required machinery field: ${field}`,
          });
        }
      }
    }

    // determine status changes (postnow/schedule logic)
    let status = existing.status;

    // parse dates
    function parseDateToMidnight(dateString) {
      if (!dateString) return null;

      let parts = dateString.split("-");
      let yyyy, mm, dd;

      if (parts[0].length === 4) {
        yyyy = parts[0];
        mm = parts[1];
        dd = parts[2];
      } else {
        dd = parts[0];
        mm = parts[1];
        yyyy = parts[2];
      }

      // Force IST midnight
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00+05:30`);
    }

    // ------- Replace your parsing -------
    // Keep existing dates unless explicitly provided
    let scheduledAt =
      scheduled_at !== undefined
        ? parseDateToMidnight(scheduled_at)
        : existing.scheduled_at;

    let expiryAt =
      expiry_date !== undefined
        ? parseDateToMidnight(expiry_date)
        : existing.expiry_date;

    const postTypeChanged = post_type && post_type !== existing.post_type;

    if (postTypeChanged && post_type === "postnow") {
      scheduledAt = null;
      const nowIST = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      nowIST.setHours(0, 0, 0, 0);
      nowIST.setDate(nowIST.getDate() + 15);
      expiryAt = nowIST;
      status = "active";
    }

    if (postTypeChanged && post_type === "schedule") {
      status = "pending";
    }

    // build update payload
    const payload = {
      title: title ?? existing.title,
      category_id: category_id ?? existing.category_id,
      subcategory_id: subcategory_id ?? existing.subcategory_id,
      product_id: product_id ?? existing.product_id,
      product_name: product_name ?? existing.product_name,
      unit: unit ?? existing.unit,
      quantity: quantity ?? existing.quantity,
      price: price ?? existing.price,
      description: description ?? existing.description,
      districts: districtsArr, // TEXT[]
      ad_type: ad_type ?? existing.ad_type,
      post_type: post_type ?? existing.post_type,
      scheduled_at: scheduledAt,
      expiry_date: expiryAt,

      // 🔥 MUST STRINGIFY JSONB FIELDS
      images: remaining,
      extra_fields: extra,

      status,
    };

    const updated = await Ad.updateAd(id, payload);

    // create log
    await AdLogs.createLog({
      ad_id: id,
      action: "update",
      actor_name: req.body.actor_name || req.user?.name || null,
      actor_role: req.body.actor_role || req.user?.role || null,
      payload: updated,
    });

    res.json({ message: "Ad updated", ad: updated });
  } catch (err) {
    console.error("updateAd error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete ad
exports.deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.getAdById(id);
    if (!ad) return res.status(404).json({ message: "Ad not found" });

    // Validate creator based on role
    let creator = null;

    if (ad.created_by_role === "user") {
      creator = await User.getUserById(ad.creator_id);
      if (!creator) return res.status(404).json({ message: "User not found" });
      if (creator.is_blocked)
        return res.status(403).json({ message: "User is blocked" });
    } else if (ad.created_by_role === "subadmin") {
      creator = await Subadmin.getSubadminById(ad.creator_id);
      if (!creator)
        return res.status(404).json({ message: "Subadmin not found" });
    } else if (ad.created_by_role === "admin") {
      creator = await Admin.getAdminById(ad.creator_id);
      if (!creator) return res.status(404).json({ message: "Admin not found" });
    } else {
      return res.status(400).json({ message: "Invalid created_by_role" });
    }

    // log deletion
    await AdLogs.createLog({
      ad_id: id,
      action: "delete",
      actor_name: req.body.actor_name || req.user?.name || null,
      actor_role: req.body.actor_role || req.user?.role || null,
      payload: ad,
    });

    // delete images from cloud
    const images = ad.images || [];
    for (const img of images) {
      if (img.public_id) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (e) {
          console.warn("Failed deleting cloud image:", e.message);
        }
      }
    }

    // delete ad
    await Ad.deleteAd(id);
    res.json({ message: "Ad deleted" });
  } catch (err) {
    console.error("deleteAd error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
