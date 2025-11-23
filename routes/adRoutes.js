// routes/adRoutes.js
const express = require("express");
const router = express.Router();
const adController = require("../controllers/adController");

// Create (multipart)
router.post("/", adController.uploadMiddleware, adController.createAd);

// Update (multipart)
router.put("/:id", adController.uploadMiddleware, adController.updateAd);

// Delete
router.delete("/:id", adController.deleteAd);

// Get all ads
router.get("/", adController.getAds);

// Get ad by id
router.get("/:id", adController.getAdById);

// Get by districts + filters
router.get("/search/by-districts", adController.getByDistricts);

module.exports = router;
