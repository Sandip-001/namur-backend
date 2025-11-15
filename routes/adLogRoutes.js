const express = require("express");
const router = express.Router();
const AdLogs = require("../models/AdLogs");

// Get all ad deletion logs
router.get("/", async (req, res) => {
  try {
    const logs = await AdLogs.getLogs();
    res.json(logs);
  } catch (err) {
    console.error("Error fetching ad logs:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
