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

    // Validate product
    const product = await Product.getProductById(product_id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Prevent adding duplicate product under same land
    if (await LandProduct.exists(user_id, land_id, product_id)) {
      return res.status(400).json({
        message: "This product is already added for this land",
      });
    }

    if (!["Food", "Machinery", "Animal"].includes(product.category_name)) {
      return res.status(400).json({
        message: "Only Food, Machinery and Animal categories are allowed",
      });
    }

    let payload = {
      user_id,
      land_id,
      product_id,
      category: product.category_name,
    };

    // Category rules ----------------------------

    if (product.category_name === "Food") {
      const newAcres = Number(req.body.acres);

      if (!newAcres)
        return res.status(400).json({ message: "acres is required" });

      // Get already assigned acres
      const usedAcres = await LandProduct.getTotalFoodAcres(user_id, land_id);

      if (usedAcres + newAcres > Number(land.farm_size)) {
        return res.status(400).json({
          message: `Total acres (${
            usedAcres + newAcres
          }) exceed land capacity (${land.farm_size})`,
        });
      }

      payload.acres = newAcres;
    }

    if (product.category_name === "Machinery") {
      const { model_no, registration_no, chassi_no, rc_copy_no } = req.body;

      if (!model_no || !registration_no || !chassi_no || !rc_copy_no)
        return res.status(400).json({
          message:
            "All machinery fields (model_no, registration_no, chassi_no, rc_copy_no) are required",
        });

      Object.assign(payload, {
        model_no,
        registration_no,
        chassi_no,
        rc_copy_no,
      });
    }

    if (product.category_name === "Animal") {
      if (!req.body.quantity)
        return res.status(400).json({ message: "quantity is required" });

      payload.quantity = req.body.quantity;
    }

    const created = await LandProduct.create(payload);

    res.json({ message: "Land product added", product: created });
  } catch (err) {
    console.log(err.message)
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

    // Allowed update fields
    let newLandId = req.body.land_id ?? existing.land_id;
    let newProductId = req.body.product_id ?? existing.product_id;

    // Validate Land
    const land = await Land.getLandById(newLandId);
    if (!land) return res.status(404).json({ message: "Land not found" });

    // Validate Product
    const product = await Product.getProductById(newProductId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check duplicate
    if (
      (newLandId != existing.land_id || newProductId != existing.product_id) &&
      (await LandProduct.exists(existing.user_id, newLandId, newProductId))
    ) {
      return res.status(400).json({
        message: "This product is already added for this land",
      });
    }

    // Payload initialization
    let payload = {
      land_id: newLandId,
      product_id: newProductId,
      category: product.category_name,
    };

    // ************* IMPORTANT NEW CODE HERE **************
    const categoryChanged = product.category_name !== existing.category;

    if (categoryChanged) {
      payload.acres = null;
      payload.model_no = null;
      payload.registration_no = null;
      payload.chassi_no = null;
      payload.rc_copy_no = null;
      payload.quantity = null;
    }
    // ****************************************************

    // FOOD CATEGORY
    if (product.category_name === "Food") {
      const newAcres = Number(req.body.acres ?? existing.acres);

      if (!newAcres)
        return res.status(400).json({ message: "acres is required" });

      // Get total acres except this product
      const usedAcres = await LandProduct.getTotalFoodAcres(
        existing.user_id,
        newLandId,
        existing.id
      );

      if (usedAcres + newAcres > Number(land.farm_size)) {
        return res.status(400).json({
          message: `Total acres (${
            usedAcres + newAcres
          }) exceed land capacity (${land.farm_size})`,
        });
      }

      payload.acres = newAcres;
    }

    // MACHINERY CATEGORY
    if (product.category_name === "Machinery") {
      const model_no = req.body.model_no ?? existing.model_no;
      const registration_no =
        req.body.registration_no ?? existing.registration_no;
      const chassi_no = req.body.chassi_no ?? existing.chassi_no;
      const rc_copy_no = req.body.rc_copy_no ?? existing.rc_copy_no;

      if (!model_no || !registration_no || !chassi_no || !rc_copy_no) {
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

    // ANIMAL CATEGORY
    if (product.category_name === "Animal") {
      const quantity = req.body.quantity ?? existing.quantity;

      if (!quantity)
        return res.status(400).json({ message: "quantity is required" });

      payload.quantity = quantity;
    }

    const updated = await LandProduct.update(id, payload);

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
    const { category_name } = req.query; // optional

    const list = await LandProduct.getAllByLand(
      user_id,
      land_id,
      category_name || null
    );

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getByUserWithOptionalCategory = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { category_name } = req.query;

    const data = await LandProduct.getAllByUser(user_id, category_name);

    return res.json(data);
  } catch (err) {
    console.error("Error in getByUser:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
