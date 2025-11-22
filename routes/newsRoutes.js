const express = require("express");
const router = express.Router();
const newsController = require("../controllers/newsController");

// CREATE
router.post("/", newsController.uploadMiddleware, newsController.createNews);

// GET ALL
router.get("/", newsController.getNews);

// UPDATE
router.put("/:id", newsController.uploadMiddleware, newsController.updateNews);

// DELETE
router.delete("/:id", newsController.deleteNews);

module.exports = router;
