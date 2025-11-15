const express = require("express");
const router = express.Router();
const adController = require("../controllers/adController");

// Create & Update routes need Multer middleware
router.post("/", adController.uploadMiddleware, adController.createAd); // Create
router.put("/:id", adController.uploadMiddleware, adController.updateAd); // Update

// Read and Delete routes
router.get("/", adController.getAds);        // Read all
router.delete("/:id", adController.deleteAd); // Delete

module.exports = router;
