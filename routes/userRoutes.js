// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const multer = require("multer");

// multer configured to save temp uploads to /uploads (you have this)
const upload = multer({ dest: "uploads/" });

// Mobile Login
// Accepts JSON body:
// { firebase_uid, email, username, profile_image_url (optional) }
router.post("/login-google", userController.loginWithGoogle);

// Mobile User Routes
router.post("/save-basic", userController.saveBasicDetails);
router.post("/verify-otp", userController.verifyOtp);
router.post("/update-extra", userController.updateAdditionalDetails);
router.post("/upload-profile", upload.single("image"), userController.uploadProfileImage);
router.get("/firebase/:firebase_uid", userController.getUser);

// Admin Routes
router.get("/admin/all", userController.getAllUsers);
router.post("/admin/block/:id", userController.blockUser);
router.post("/admin/unblock/:id", userController.unblockUser);
router.get("/admin/user/:id", userController.getUserById);

module.exports = router;
