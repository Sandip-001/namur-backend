const express = require("express");
const router = express.Router();
const landProductController = require("../controllers/landProductController");

// Create
router.post("/create", landProductController.createLandProduct);

// Edit
router.put("/update/:id", landProductController.updateLandProduct);

// Delete
router.delete("/delete/:id", landProductController.deleteLandProduct);

// Get all land products by user + optional category filter
router.get("/user/:user_id", landProductController.getByUserWithOptionalCategory);

// Get all products under this user + land
router.get("/:user_id/:land_id", landProductController.getLandProducts);


module.exports = router;