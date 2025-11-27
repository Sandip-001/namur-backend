// routes/cropPlanRoutes.js
const express = require("express");
const router = express.Router();
const cropPlanController = require("../controllers/cropPlanController");

// Create a crop plan
router.post("/", cropPlanController.createCropPlan);

// Get all crop plans for a user
router.get("/user/:user_id", cropPlanController.getCropPlansByUser);

// Get single crop plan
router.get("/:id", cropPlanController.getCropPlanById);

// Update crop plan
router.put("/:id", cropPlanController.updateCropPlan);

// Delete crop plan
router.delete("/:id", cropPlanController.deleteCropPlan);

module.exports = router;