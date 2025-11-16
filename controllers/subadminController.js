const Subadmin = require("../models/subadminModel");
const cloudinary = require("cloudinary").v2;

// Upload helper
const uploadImageToCloudinary = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath, { folder: "Namur_subadmins" });
  return result.secure_url;
};

const deleteImageFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;

  try {
    // Cloudinary public_id is the filename without extension
    const publicId = imageUrl.split("/").pop().split(".")[0];

    await cloudinary.uploader.destroy(`Namur_subadmins/${publicId}`);
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
  }
};


// Create Subadmin
exports.createSubadmin = async (req, res) => {
  try {
    const { name, email, password, number, qualification, address, districts, pageAccess } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required" });
    }

    let imageUrl = "";
    if (req.file) {
      console.log("File received:", req.file); // debug
      imageUrl = await uploadImageToCloudinary(req.file.path);
      console.log("Uploaded to Cloudinary:", imageUrl);
    }

    const subadmin = await Subadmin.createSubadmin({
      name,
      email,
      password,
      number,
      qualification,
      address,
      districts: Array.isArray(districts) ? districts.join(",") : districts,
      page_access: Array.isArray(pageAccess) ? pageAccess.join(",") : pageAccess, // fixed
      image_url: imageUrl //  will now store correctly
    });

    res.status(201).json({ message: "Subadmin created successfully", subadmin });
  } catch (error) {
    console.error("Error in createSubadmin:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get All Subadmins
exports.getSubadmins = async (req, res) => {
  try {
    const subadmins = await Subadmin.getSubadmins();
    res.status(200).json(subadmins);
  } catch (error) {
    console.error("Error in getSubadmins:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Subadmin By ID
exports.getSubadminById = async (req, res) => {
  try {
    const { id } = req.params;
    const subadmin = await Subadmin.getSubadminById(id);
    if (!subadmin) return res.status(404).json({ message: "Subadmin not found" });
    res.status(200).json(subadmin);
  } catch (error) {
    console.error("Error in getSubadminById:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Update Subadmin 
exports.updateSubadmin = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      phone,
      qualification,
      address,
      districts,
      page_access
    } = req.body;

    // Fetch existing subadmin first
    const existing = await Subadmin.getSubadminById(id);
    if (!existing) {
      return res.status(404).json({ message: "Subadmin not found" });
    }

    let image_url = existing.image_url;

    // If new file uploaded → upload & delete old image
    if (req.file) {
      // delete old
      await deleteImageFromCloudinary(existing.image_url);

      // upload new
      image_url = await uploadImageToCloudinary(req.file.path);
    }

    const updated = await Subadmin.updateSubadmin(id, {
      name,
      email,
      number: phone || null,
      qualification,
      address,
      districts: Array.isArray(districts) ? districts.join(",") : districts,
      page_access: Array.isArray(page_access) ? page_access.join(",") : page_access,
      image_url
    });

    res.status(200).json({ message: "Subadmin updated", subadmin: updated });

  } catch (error) {
    console.error("Error in updateSubadmin:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// DELETE SUBADMIN
exports.deleteSubadmin = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Find existing subadmin
    const existing = await Subadmin.getSubadminById(id);

    if (!existing) {
      return res.status(404).json({ message: "Subadmin not found" });
    }

    // 2️⃣ Delete image from Cloudinary (if exists)
    if (existing.image_url) {
      await deleteImageFromCloudinary(existing.image_url);
    }

    // 3️⃣ Delete from DB
    await Subadmin.deleteSubadmin(id);

    res.status(200).json({ message: "Subadmin deleted successfully" });

  } catch (error) {
    console.error("Error in deleteSubadmin:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
