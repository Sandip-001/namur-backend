const News = require("../models/newsModel");
const NewsLog = require("../models/newsLogModel");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadMiddleware = upload.single("image");

// Helper for Cloudinary upload
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "Namur_news" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(file.buffer);
  });
};

// ==========================================
// CREATE NEWS
// ==========================================
exports.createNews = async (req, res) => {
  try {
    const { title, url } = req.body;
    const actorName = req.body.actorName || req.user?.name || "Unknown";
    const actorRole = req.body.actorRole || req.user?.role || "Unknown";

    if (!title || !url)
      return res.status(400).json({ message: "Title and URL are required" });

    let imageUrl = null;
    let imageId = null;

    if (req.file) {
      const result = await uploadToCloudinary(req.file);
      imageUrl = result.secure_url;
      imageId = result.public_id;
    }

    const news = await News.createNews(title, url, imageUrl, imageId);

    await NewsLog.createLog(
      news.id,
      title,
      url,
      "create",
      actorName,
      actorRole
    );

    res.status(201).json({ message: "News created", news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// GET ALL NEWS
// ==========================================
exports.getNews = async (req, res) => {
  try {
    const list = await News.getNews();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// UPDATE NEWS
// ==========================================
exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url } = req.body;

    const actorName = req.body.actorName || req.user?.name || "Unknown";
    const actorRole = req.body.actorRole || req.user?.role || "Unknown";

    const news = await News.getNewsById(id);
    if (!news) return res.status(404).json({ message: "News not found" });

    let imageUrl = news.image_url;
    let imageId = news.image_id;

    // If new image uploaded, replace old image
    if (req.file) {
      // delete old image from cloudinary (optional)
      if (news.image_id) {
        try {
          await cloudinary.uploader.destroy(news.image_id);
        } catch (err) {
          console.log("Cloudinary delete failed:", err.message);
        }
      }

      const uploaded = await uploadToCloudinary(req.file);
      imageUrl = uploaded.secure_url;
      imageId = uploaded.public_id;
    }

    const updated = await News.updateNews(id, {
      title,
      url,
      image_url: imageUrl,
      image_id: imageId,
    });

    // Log action
    await NewsLog.createLog(
      id,
      updated.title,
      updated.url,
      "update",
      actorName,
      actorRole
    );

    res.json({ message: "News updated", news: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// DELETE NEWS
// ==========================================
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const actorName = req.body.actorName || req.user?.name || "Unknown";
    const actorRole = req.body.actorRole || req.user?.role || "Unknown";

    const news = await News.getNewsById(id);
    if (!news) return res.status(404).json({ message: "News not found" });

    // FIRST: Create log BEFORE deleting the news
    await NewsLog.createLog(
      id,
      news.title,
      news.url,
      "delete",
      actorName,
      actorRole
    );

    // THEN delete cloudinary image
    if (news.image_id) {
      await cloudinary.uploader.destroy(news.image_id);
    }

    // FINALLY delete the news row
    const deleted = await News.deleteNews(id);

    res.json({ message: "News deleted", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

