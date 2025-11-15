const express = require("express");
const router = express.Router();
const newsController = require("../controllers/newsController");

// CRUD routes
router.post("/", newsController.uploadMiddleware, newsController.createNews);
router.get("/", newsController.getNews);
router.put("/:id", newsController.uploadMiddleware, newsController.updateNews);
router.delete("/:id", newsController.deleteNews);

module.exports = router;
