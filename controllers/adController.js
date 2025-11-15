const Ad = require("../models/adModel");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");
const AdLogs = require("../models/AdLogs");
// Multer (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadMiddleware = upload.array("images", 10); // allow multiple images

// Create new Ad

exports.createAd = async (req, res) => {
  try {
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
      created_by,
      creator_id,
    } = req.body;

    if (!title || !product_id || !product_name || !districts || !ad_type || !created_by || !creator_id) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      // Upload each file to Cloudinary
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "ads" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(file.buffer);
        });
        imageUrls.push(result.secure_url);
      }
    }

    const ad = await Ad.createAd({
      title,
      sub_category,
      product_id,
      product_name,
      unit,
      quantity,
      price,
      description,
      districts: districts.split(","), // frontend sends comma-separated
      ad_type,
      post_type,
      scheduled_at,
      expiry_date,
      images: imageUrls,
      created_by,
      creator_id,
    });

    res.status(201).json({ message: "Ad created", ad });
  } catch (err) {
    console.error("Error creating ad:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all Ads
exports.getAds = async (req, res) => {
  try {
    const ads = await Ad.getAds();
    res.json(ads);
  } catch (err) {
    console.error("Error fetching ads:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update Ad

exports.updateAd = async (req, res) => {
  try {
    const { id } = req.params;
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
      existingImages,
    } = req.body;

    const ad = await Ad.getAdById(id);
    if (!ad) return res.status(404).json({ message: "Ad not found" });

    // Parse districts (accept array or comma-separated string)
    const districtsArray = Array.isArray(districts)
      ? districts
      : typeof districts === "string"
      ? districts.split(",")
      : [];

    // Parse existingImages
    const existingImgs = existingImages ? JSON.parse(existingImages) : [];
    let imageUrls = [...existingImgs];

    // Upload new images if provided
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "ads" },
            (err, res) => (err ? reject(err) : resolve(res))
          );
          stream.end(file.buffer);
        });
        imageUrls.push(result.secure_url);
      }
    }

    // Update ad in DB
    const updated = await Ad.updateAd(id, {
      title: title || ad.title,
      sub_category: sub_category || ad.sub_category,
      product_id: product_id || ad.product_id,
      product_name: product_name || ad.product_name,
      unit: unit || ad.unit,
      quantity: quantity || ad.quantity,
      price: price || ad.price,
      description: description || ad.description,
      districts: districtsArray,
      ad_type: ad_type || ad.ad_type,
      post_type: post_type || ad.post_type,
      scheduled_at: scheduled_at || ad.scheduled_at,
      expiry_date: expiry_date || ad.expiry_date,
      images: imageUrls,
    });

    res.json({ message: "Ad updated", ad: updated });
  } catch (err) {
    console.error("Error updating ad:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete Ad
// Delete Ad and log it
exports.deleteAd = async (req, res) => {
  try {
    const { id } = req.params;

    // Get ad details before deleting
    const ad = await Ad.getAdById(id);
    if (!ad) return res.status(404).json({ message: "Ad not found" });

    // Create deletion log
    await AdLogs.createLog({
      ad_id: ad.id,
      product_name: ad.product_name,
      unit: ad.unit,
      price: ad.price,
      deleted_by: "admin",     
      user_name: "Admin Panel"
    });

    // Delete the ad
    const result = await Ad.deleteAd(id);
    res.json(result);
  } catch (err) {
    console.error("Error deleting ad:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
