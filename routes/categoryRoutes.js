const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

// CRUD routes
router.post("/", categoryController.uploadMiddleware, categoryController.createCategory);
router.get("/", categoryController.getCategories);
router.put("/:id",categoryController.uploadMiddleware, categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
