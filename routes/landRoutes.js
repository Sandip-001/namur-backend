const express = require("express");
const router = express.Router();
const landController = require("../controllers/landController");

// Create land
router.post("/create", landController.createLand);

// Get all lands by user
router.get("/user/:user_id", landController.getUserLands);

// Get single land
router.get("/:id", landController.getLand);

// Update land
router.put("/:id", landController.updateLand);

// Delete land
router.delete("/:id", landController.deleteLand);

module.exports = router;