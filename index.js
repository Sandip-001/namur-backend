require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

(async () => {
  const Category = require("./models/categoryModel");
  await new Promise((r) => setTimeout(r, 1000)); // wait for category table

  const Subcategory = require("./models/subcategoryModel");
  await new Promise((r) => setTimeout(r, 1000)); // wait for subcategory table

  const Product = require("./models/productModel");
})();


// Routes
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admins", adminRoutes);   //  Correct prefix

const userRoutes = require("./routes/userRoutes");
app.use("/api/user", userRoutes);

const landRoutes = require("./routes/landRoutes");
app.use("/api/land", landRoutes)

const landProductRoutes = require("./routes/landProductRoutes");
app.use("/api/land-product", landProductRoutes)

const categoryRoutes = require("./routes/categoryRoutes");
app.use("/api/categories", categoryRoutes);

const subcategoryRoutes = require("./routes/subcategoryRoutes");
app.use("/api/subcategories", subcategoryRoutes);

const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

const enquiryRoutes = require("./routes/productEnquiryRoutes");
app.use("/api/enquiry", enquiryRoutes);

const landMapRoutes = require("./routes/landMapRoutes");
app.use("/api/land-maps", landMapRoutes);

const adRoutes = require("./routes/adRoutes");
app.use("/api/ads", adRoutes);

// server.js (example)
const adScheduler = require("./jobs/adScheduler");
adScheduler.start();

const subadminRoutes = require("./routes/subadminRoutes");
app.use("/api/subadmins", subadminRoutes);

const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);


const newsRoutes = require("./routes/newsRoutes");
app.use("/api/news", newsRoutes);

const newsLogRoutes = require("./routes/newsLogRoutes");
app.use("/api/newsLogRoutes", newsLogRoutes);

const adLogRoutes = require("./routes/adLogRoutes");
app.use("/api/adLog", adLogRoutes);

const cropCalendarRoutes = require("./routes/cropCalendarRoutes");
app.use("/api/crop-calendars", cropCalendarRoutes);

const cropPlanRoutes = require("./routes/cropPlanRoutes");
app.use("/api/crop-plan", cropPlanRoutes);

const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await pool.connect();
    console.log(" PostgreSQL connected successfully");
  } catch (err) {
    console.error(" DB connection error:", err);
  }
  console.log(` Server running on port ${PORT}`);
});
