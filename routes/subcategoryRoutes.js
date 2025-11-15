const express = require("express");
const router = express.Router();
const subcategoryController = require("../controllers/subcategoryController");

// CRUD routes
router.post("/", subcategoryController.createSubcategory);
router.get("/", subcategoryController.getSubcategories);
router.get("/category/:category_id", subcategoryController.getSubcategoriesByCategory); // ✅ new route
router.put("/:id", subcategoryController.updateSubcategory);
router.delete("/:id", subcategoryController.deleteSubcategory);

module.exports = router;
