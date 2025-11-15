import bcrypt from "bcryptjs";
import Admin from "../models/adminModel.js"; // make sure this is exported correctly for ES modules
import jwt from "jsonwebtoken";
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.getAdminByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save admin
    const newAdmin = await Admin.createAdmin(name, email, hashedPassword);

    res.status(201).json({ message: "Admin registered successfully", admin: newAdmin });
  } catch (error) {
    console.error("Error in registerAdmin:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "All fields required" });

    const admin = await Admin.getAdminByEmail(email);
    if (!admin) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error in loginAdmin:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};