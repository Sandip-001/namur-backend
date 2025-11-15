import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import Subadmin from "../models/subadminModel.js";

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }

    let user;

    if (role === "admin") {
      user = await Admin.getAdminByEmail(email);
      if (!user) return res.status(400).json({ message: "Invalid admin credentials" });
    } else if (role === "subadmin") {
      user = await Subadmin.getSubadminByEmail(email);
      if (!user) return res.status(400).json({ message: "Invalid subadmin credentials" });
    } else {
      return res.status(400).json({ message: "Role must be either 'admin' or 'subadmin'" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        districts: role === "subadmin" ? user.districts?.split(",") : undefined,   // return as array
        page_access: role === "subadmin" ? user.page_access?.split(",") : undefined // ✅ added
      },
    });

  } catch (error) {
    console.error("Error in login:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
