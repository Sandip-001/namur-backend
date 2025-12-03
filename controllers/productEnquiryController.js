// controllers/productEnquiryController.js
const ProductEnquiry = require("../models/productEnquiryModel");
const Product = require("../models/productModel"); // used to validate product exist

exports.createEnquiry = async (req, res) => {
  try {
    const { user_id, product_id, breed, enquiry_type, description } = req.body;

    if (!user_id || !product_id || !enquiry_type) {
      return res.status(400).json({ message: "Required fields missing!" });
    }

    const enquiry = await ProductEnquiry.createEnquiry({
      user_id,
      product_id,
      breed,
      enquiry_type,
      description,
    });

    res.json(enquiry);
  } catch (err) {
    console.error("Create Enquiry Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await ProductEnquiry.getEnquiries();
    res.json(enquiries);
  } catch (err) {
    console.error("Fetch Enquiries Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateEnquiry = async (req, res) => {
  try {

    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Invalid enquiry id" });
    }

    const existing = await ProductEnquiry.getEnquiryById(id);

    if (!existing) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    const fields = {};
    const allowed = ["product_id", "breed", "enquiry_type", "description", "user_id"];

    for (const key of allowed) {
      if (req.body[key] !== undefined && req.body[key] !== null) {
        fields[key] = req.body[key];
      }
    }

    // Validate product_id if changed
    if (fields.product_id !== undefined) {
      const prod = await Product.getProductById(Number(fields.product_id));

      if (!prod) {
        console.log("❌ Product Not Found!");
        return res.status(404).json({
          message: "Product not found for provided product_id",
        });
      }
    }

    // Validate enquiry_type
    if (fields.enquiry_type) {
      const et = fields.enquiry_type.toLowerCase();

      if (!["buy", "rent"].includes(et)) {
        console.log("❌ Invalid enquiry type");
        return res.status(400).json({
          message: "enquiry_type must be 'buy' or 'rent'",
        });
      }
      fields.enquiry_type = et;
    }

    const updated = await ProductEnquiry.updateEnquiry(id, fields);

    if (!updated) {
      return res.status(400).json({ message: "Update failed" });
    }

    return res.json({
      message: "Updated successfully",
      updated,
    });

  } catch (err) {
    console.error("🔥 Update Enquiry Error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

exports.deleteEnquiry = async (req, res) => {
  try {
    const id = req.params.id;

    const deletion = await ProductEnquiry.deleteEnquiry(id);
    res.json(deletion);
  } catch (err) {
    console.error("Delete Enquiry Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
