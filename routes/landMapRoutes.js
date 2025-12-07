// routes/landMapRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // memory storage
const landMapController = require("../controllers/landMapController");

// POST /api/land-maps/upload  (multipart/form-data with file field 'file')
router.post("/upload", upload.single("file"), landMapController.uploadExcel);

// GET /api/land-maps
router.get("/", landMapController.getAll);

router.get("/match-land", landMapController.getMatchedLandData);

// DELETE /api/land-maps/:id
router.delete("/:id", landMapController.delete);

module.exports = router;