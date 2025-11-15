// routes/adminRoutes.js
const express = require("express");
const { registerAdmin ,loginAdmin} = require("../controllers/adminController");
const { login } = require("../controllers/authController");
 
const router = express.Router();

// POST /api/admins/register
router.post("/register", registerAdmin);
router.post("/login", login);

module.exports = router;   // ✅ use CommonJS export
