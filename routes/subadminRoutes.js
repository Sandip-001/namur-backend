const express = require("express");
const multer = require("multer");
const { createSubadmin, getSubadmins, getSubadminById, updateSubadmin, deleteSubadmin } = require("../controllers/subadminController");

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // temp folder, image goes to Cloudinary

// POST /api/subadmins
router.post("/", upload.single("image"), createSubadmin);

// GET /api/subadmins
router.get("/", getSubadmins);

// GET /api/subadmins/:id
router.get("/:id", getSubadminById);

// PUT /api/subadmins/:id
router.put("/:id", upload.single("image"), updateSubadmin);

// DELETE /api/subadmins/:id
router.delete("/:id", deleteSubadmin);

module.exports = router;
