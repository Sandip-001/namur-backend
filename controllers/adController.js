// controllers/adController.js
const Ad = require("../models/adModel");
const AdLogs = require("../models/AdLogs");
const User = require("../models/userModel");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");
const Category = require("../models/categoryModel");

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

    // restrict blocked user
    const creator = await User.getUserById(Number(creator_id));
    if (!creator)
      return res.status(404).json({ message: "Creator user not found" });
    if (creator.is_blocked)
      return res.status(403).json({ message: "User is blocked" });

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
    let scheduledAt = scheduled_at ? new Date(scheduled_at) : null;
    if (scheduled_at && isNaN(scheduledAt.getTime())) {
      // support dd-mm-yyyy
      const parts = scheduled_at.split("-");
      if (parts.length === 3)
        scheduledAt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
    }
    let expiryAt = expiry_date ? new Date(expiry_date) : null;
    if (expiry_date && isNaN(expiryAt.getTime())) {
      const parts = expiry_date.split("-");
      if (parts.length === 3)
        expiryAt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
    }

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
exports.getByDistricts = async (req, res) => {
  try {
    let { districts, ad_type, status } = req.query;
    // districts can be comma-separated or JSON array
    let districtsArr = [];
    if (!districts) districtsArr = [];
    else {
      try {
        districtsArr = JSON.parse(districts);
        if (!Array.isArray(districtsArr))
          districtsArr = districts.split(",").map((s) => s.trim());
      } catch {
        districtsArr = districts.split(",").map((s) => s.trim());
      }
    }

    const ads = await Ad.getAdsByDistrictsAndFilters({
      districts: districtsArr,
      ad_type,
      status,
    });
    res.json(ads);
  } catch (err) {
    console.error("getByDistricts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update ad
exports.updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Ad.getAdById(id);
    if (!existing) return res.status(404).json({ message: "Ad not found" });

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

    // restriction: if creator is blocked
    const creator = await User.getUserById(existing.creator_id);
    if (!creator)
      return res.status(404).json({ message: "Creator user not found" });
    if (creator.is_blocked)
      return res.status(403).json({ message: "Creator is blocked" });

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
      if (!unit) {
        return res
          .status(400)
          .json({ message: "Unit is required for Food/Animal category" });
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
    if (post_type === "postnow") {
      status = "active";
      // set expiry if not supplied: 15 days from now
      if (!expiry_date && !existing.expiry_date) {
        const dt = new Date();
        expiry_date = new Date(dt.getTime() + 15 * 24 * 60 * 60 * 1000);
      }
    } else if (post_type === "schedule" && scheduled_at) {
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
      scheduled_at: scheduled_at
        ? new Date(scheduled_at)
        : existing.scheduled_at,
      expiry_date: expiry_date ? new Date(expiry_date) : existing.expiry_date,

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

    // restriction: check creator not blocked
    const creator = await User.getUserById(ad.creator_id);
    if (!creator)
      return res.status(404).json({ message: "Creator user not found" });
    if (creator.is_blocked)
      return res.status(403).json({ message: "Creator is blocked" });

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
