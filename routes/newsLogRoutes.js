const express = require("express");
const router = express.Router();
const NewsLog = require("../models/newsLogModel");

// Get all logs
router.get("/", async (req, res) => {
  try {
    const logs = await NewsLog.getLogs();
    res.json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;