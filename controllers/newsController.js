const News = require("../models/newsModel");
const NewsLog = require("../models/newsLogModel");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadMiddleware = upload.single("image");

// Create news
exports.createNews = async (req, res) => {
  try {
    const { title, url } = req.body;
    if (!title || !url) {
      return res.status(400).json({ message: "Title and URL are required" });
    }

    let imageUrl = null;
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "news" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    const news = await News.createNews(title, url, imageUrl);

    // 🔹 Log the creation
    // await NewsLog.createLog(news.id, "create", null, news);

    res.status(201).json({ message: "News created", news });
  } catch (err) {
    console.error("Error creating news:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all news
exports.getNews = async (req, res) => {
  try {
    const newsList = await News.getNews();
    res.json(newsList);
  } catch (err) {
    console.error("Error fetching news:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update news
exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url } = req.body;
    if (!title || !url) {
      return res.status(400).json({ message: "Title and URL are required" });
    }

    const oldNews = await News.getNewsById(id); // 🔹 Fetch old record

    let imageUrl;
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "news" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    const updated = await News.updateNews(id, title, url, imageUrl);

    // 🔹 Log the update
    // await NewsLog.createLog(id, "update", oldNews, updated);

    res.json({ message: "News updated", news: updated });
  } catch (err) {
    console.error("Error updating news:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete news
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const oldNews = await News.getNewsById(id); // 🔹 Fetch before delete
    const result = await News.deleteNews(id);

    // 🔹 Log the deletion
    await NewsLog.createLog(id, "delete", oldNews, null);

    res.json(result);
  } catch (err) {
    console.error("Error deleting news:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
