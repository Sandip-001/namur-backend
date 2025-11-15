const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// CRUD routes
router.post("/", productController.uploadMiddleware, productController.createProduct); // Create with image
router.get("/", productController.getProducts);         // Read all
router.get("/subcategory/:subcategory_id", productController.getProductsBySubcategory);
router.put("/:id", productController.uploadMiddleware, productController.updateProduct); // Update with image
router.delete("/:id", productController.deleteProduct); // Delete

module.exports = router;
