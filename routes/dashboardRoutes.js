const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// GET Dashboard overview
router.get("/", dashboardController.getDashboardStats);

module.exports = router;
