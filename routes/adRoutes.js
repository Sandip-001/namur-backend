// routes/adRoutes.js
const express = require("express");
const router = express.Router();
const adController = require("../controllers/adController");

const adScheduler = require("../jobs/adScheduler");

// Create (multipart)
router.post("/", adController.uploadMiddleware, adController.createAd);

// Update (multipart)
router.put("/:id", adController.uploadMiddleware, adController.updateAd);

// Delete
router.delete("/:id", adController.deleteAd);

// Get all ads
router.get("/", adController.getAds);

// Get by districts + filters
router.get("/filter", adController.filterAds);

// Get ad by id
router.get("/:id", adController.getAdById);



router.get("/test/scheduler", async (req, res) => {
  try {
    await adScheduler.runOnce();
    res.json({ message: "Scheduler executed manually" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
