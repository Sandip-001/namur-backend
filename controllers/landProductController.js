const User = require("../models/userModel");
const Land = require("../models/landModel");
const LandProduct = require("../models/landProductModel");
const Product = require("../models/productModel");

// Check user blocked
async function verifyNotBlocked(user_id) {
  const user = await User.getUserById(user_id);
  if (!user) return { fail: true, message: "User not found" };
  if (user.is_blocked)
    return { fail: true, message: "User is blocked. Action not allowed." };

  return { fail: false, user };
}


// Create landProduct
exports.createLandProduct = async (req, res) => {
  try {
    const { user_id, land_id, product_id } = req.body;

    // Block check
    const block = await verifyNotBlocked(user_id);
    if (block.fail) return res.status(403).json({ message: block.message });

    // Validate land
    const land = await Land.getLandById(land_id);
    if (!land) return res.status(404).json({ message: "Land not found" });

    // Validate product and category
    const product = await Product.getProductById(product_id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    if (!["Food", "Machinery", "Animal"].includes(product.category_name))
      return res.status(400).json({
        message:
          "Only Food, Machinery and Animal category products are allowed",
      });

    let payload = {
      user_id,
      land_id,
      product_id,
      category: product.category_name,
    };

    // FOOD rules
    if (product.category_name === "Food") {
      if (!req.body.acres)
        return res.status(400).json({ message: "acres is required" });

      if (Number(req.body.acres) > Number(land.farm_size)) {
        return res.status(400).json({
          message:
            "Food acres cannot be greater than total land acres (" +
            land.farm_size +
            ")",
        });
      }

      payload.acres = req.body.acres;
    }

    // MACHINERY rules
    if (product.category_name === "Machinery") {
      const { model_no, registration_no, chassi_no, rc_copy_no } = req.body;

      if (
        !model_no ||
        !registration_no ||
        !chassi_no ||
        !rc_copy_no
      ) {
        return res.status(400).json({
          message:
            "All machinery fields (model_no, registration_no, chassi_no, rc_copy_no) are required",
        });
      }

      Object.assign(payload, {
        model_no,
        registration_no,
        chassi_no,
        rc_copy_no,
      });
    }

    // ANIMALS rules
    if (product.category_name === "Animal") {
      if (!req.body.quantity)
        return res.status(400).json({ message: "quantity is required" });

      payload.quantity = req.body.quantity;
    }

    // Create
    const created = await LandProduct.create(payload);

    res.json({ message: "Land product added", product: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateLandProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await LandProduct.getById(id);
    if (!existing)
      return res.status(404).json({ message: "Land product not found" });

    // Check user block
    const block = await verifyNotBlocked(existing.user_id);
    if (block.fail) return res.status(403).json({ message: block.message });

    // Prevent updating product_id/category
    delete req.body.category;
    delete req.body.product_id;
    delete req.body.user_id;
    delete req.body.land_id;

    const updated = await LandProduct.update(id, req.body);

    res.json({ message: "Land product updated", product: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteLandProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await LandProduct.getById(id);
    if (!existing)
      return res.status(404).json({ message: "Land product not found" });

    // Block check
    const block = await verifyNotBlocked(existing.user_id);
    if (block.fail) return res.status(403).json({ message: block.message });

    const deleted = await LandProduct.delete(id);
    res.json({ message: "Land product deleted", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLandProducts = async (req, res) => {
  try {
    const { user_id, land_id } = req.params;

    const list = await LandProduct.getAllByLand(user_id, land_id);

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
