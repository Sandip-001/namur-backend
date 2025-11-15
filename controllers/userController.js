// controllers/userController.js
const User = require("../models/userModel");
const cloudinary = require("../config/cloudinaryConfig");
const fs = require("fs");
const path = require("path");

// 1. Firebase login callback → Create or find user
// Expects body: { firebase_uid, email, username, profile_image_url (optional) }
exports.loginWithGoogle = async (req, res) => {
  try {
    const { firebase_uid, email, username, profile_image_url } = req.body;

    if (!firebase_uid || !email)
      return res.status(400).json({ message: "firebase_uid & email required" });

    const user = await User.findOrCreate(
      firebase_uid,
      email,
      username || null,
      profile_image_url || null
    );

    res.json({ message: "Login success", user });
  } catch (err) {
    console.error("loginWithGoogle error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 2. Save basic details (mobile must be unique across users)
exports.saveBasicDetails = async (req, res) => {
  try {
    const { firebase_uid, mobile, district, profession, age } = req.body;

    if (!firebase_uid)
      return res.status(400).json({ message: "firebase_uid is required" });

    const existing = await User.getUser(firebase_uid);
    if (!existing) return res.status(404).json({ message: "User not found" });

    if (existing.is_blocked)
      return res.status(403).json({ message: "Your account is blocked by admin" });

    // check mobile taken by other user
    if (mobile) {
      const taken = await User.isMobileTakenByOther(mobile, firebase_uid);
      if (taken)
        return res
          .status(409)
          .json({ message: "Mobile number is already used by another account" });
    }

    const user = await User.updateBasicDetails(
      firebase_uid,
      mobile,
      district,
      profession,
      age
    );

    if (!user) return res.status(500).json({ message: "Failed to update user" });

    res.json({ message: "Basic details saved", user });
  } catch (err) {
    console.error("saveBasicDetails error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 3. Verify OTP (Dummy: 0000)
exports.verifyOtp = async (req, res) => {
  try {
    const { firebase_uid, otp } = req.body;

    if (!firebase_uid) return res.status(400).json({ message: "firebase_uid required" });

    if (otp !== "0000") return res.status(400).json({ message: "Invalid OTP" });

    const existing = await User.getUser(firebase_uid);
    if (!existing) return res.status(404).json({ message: "User not found" });
    if (existing.is_blocked) return res.status(403).json({ message: "Your account is blocked by admin" });

    const user = await User.verifyOtp(firebase_uid);

    res.json({ message: "OTP Verified", user });
  } catch (err) {
    console.error("verifyOtp error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 4. Update extra profile details
exports.updateAdditionalDetails = async (req, res) => {
  try {
    const { firebase_uid, taluk, village, panchayat } = req.body;

    if (!firebase_uid) return res.status(400).json({ message: "firebase_uid required" });

    const existing = await User.getUser(firebase_uid);
    if (!existing) return res.status(404).json({ message: "User not found" });

    if (existing.is_blocked)
      return res.status(403).json({ message: "Your account is blocked by admin" });

    const user = await User.updateAdditionalDetails(
      firebase_uid,
      taluk || null,
      village || null,
      panchayat || null
    );

    res.json({ message: "Additional details updated", user });
  } catch (err) {
    console.error("updateAdditionalDetails error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Helper: upload buffer to cloudinary via multer file path
const uploadFileToCloudinary = async (filePath, folder = "Namur_users/profile") => {
  const result = await cloudinary.uploader.upload(filePath, { folder });
  return result;
};

// 5. Upload profile picture (Cloudinary). Delete old cloud image if public id exists.
exports.uploadProfileImage = async (req, res) => {
  try {
    const { firebase_uid } = req.body;

    if (!firebase_uid) return res.status(400).json({ message: "firebase_uid required" });

    const existing = await User.getUser(firebase_uid);
    if (!existing) return res.status(404).json({ message: "User not found" });

    if (existing.is_blocked)
      return res.status(403).json({ message: "Your account is blocked by admin" });

    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    // Upload new image
    const filePath = req.file.path;
    const uploadResult = await uploadFileToCloudinary(filePath, "Namur_users/profile");

    // delete local temp file (multer dest)
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

    // if old image is stored in cloudinary (public id exists) - delete it
    if (existing.profile_image_public_id) {
      try {
        await cloudinary.uploader.destroy(existing.profile_image_public_id);
      } catch (err) {
        console.warn("Failed to delete old cloudinary image:", err.message);
      }
    }

    const user = await User.updateProfileImage(
      firebase_uid,
      uploadResult.secure_url,
      uploadResult.public_id
    );

    res.json({ message: "Profile image updated", user });
  } catch (err) {
    console.error("uploadProfileImage error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 6. Get logged-in user data (by firebase uid)
exports.getUser = async (req, res) => {
  try {
    const { firebase_uid } = req.params;
    const user = await User.getUser(firebase_uid);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("getUser error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ADMIN: Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error("getAllUsers error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ADMIN: Block user
exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.blockUser(id);

    res.json({ message: "User blocked", user });
  } catch (err) {
    console.error("blockUser error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ADMIN: Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.unblockUser(id);

    res.json({ message: "User unblocked", user });
  } catch (err) {
    console.error("unblockUser error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ADMIN: Get user by numeric ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.getUserById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({ error: err.message });
  }
};