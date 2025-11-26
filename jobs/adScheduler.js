// jobs/adScheduler.js
const cron = require("node-cron");
const pool = require("../config/db");
const Ad = require("../models/adModel");
const AdLogs = require("../models/AdLogs");
const cloudinary = require("../config/cloudinaryConfig");

/**
 * 👉 Get today's date as YYYY-MM-DD in IST
 */
function getTodayDateIST() {
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  nowIST.setHours(0, 0, 0, 0);
  return nowIST.toISOString().split("T")[0];
}

/**
 * 🟦 STEP 1 — Activate scheduled ads whose date == today
 */
async function activateScheduledAds() {
  try {
    const today = getTodayDateIST();

    const result = await pool.query(
      `
      SELECT * FROM ads 
      WHERE post_type = 'schedule'
      AND status = 'pending'
      AND DATE(scheduled_at AT TIME ZONE 'Asia/Kolkata') = $1
      `,
      [today]
    );

    if (result.rows.length === 0) {
      console.log("🟡 No scheduled ads to activate today");
      return;
    }

    for (const ad of result.rows) {
      await Ad.activateAd(ad.id);

      await AdLogs.createLog({
        ad_id: ad.id,
        action: "activated_scheduled",
        actor_name: "system",
        actor_role: "system",
        payload: { scheduled_at: ad.scheduled_at },
      });
    }

    console.log(`🟢 Activated ${result.rows.length} scheduled ads`);
  } catch (err) {
    console.error("❌ activateScheduledAds error:", err);
  }
}



/**
 * 🔴 STEP 2 — Expire ads whose expiry_date < today
 * (runs only after activation step)
 */
async function expireAds() {
  try {
    const today = getTodayDateIST();

    const result = await pool.query(
      `
      SELECT * FROM ads 
      WHERE status = 'active'
      AND expiry_date IS NOT NULL 
      AND DATE(expiry_date AT TIME ZONE 'Asia/Kolkata') < $1
      `,
      [today]
    );

    if (result.rows.length === 0) {
      console.log("🟡 No ads to expire today");
      return;
    }

    for (const ad of result.rows) {
      const images = ad.images || [];

      // 🧹 First delete from Cloudinary
      for (const img of images) {
        if (img.public_id) {
          try {
            await cloudinary.uploader.destroy(img.public_id);
            console.log(`🗑 Deleted Cloudinary Image: ${img.public_id}`);
          } catch (err) {
            console.error("⚠ Error deleting Cloudinary image:", err);
          }
        }
      }

      // 📝 Log before deletion
      await AdLogs.createLog({
        ad_id: ad.id,
        action: "auto_expired",
        actor_name: "system",
        actor_role: "system",
        payload: ad,
      });

      // ❌ Then delete ad from DB
      await pool.query("DELETE FROM ads WHERE id=$1", [ad.id]);
    }

    console.log(`🔴 Expired, removed images, & deleted ${result.rows.length} ads`);
  } catch (err) {
    console.error("❌ expireAds error:", err);
  }
}



/**
 * ▶️ Manual trigger for Postman testing
 */
async function runOnce() {
  console.log("⏳ Manual Scheduler Triggered...");
  await activateScheduledAds();
  await expireAds();
  console.log("✔ Manual Scheduler Complete");
}

module.exports = {
  start: () => {
    /**
     * 🕛 Run daily 00:00 AM IST (18:30 UTC previous day)
     */
    cron.schedule(
      "30 18 * * *",
      async () => {
        console.log("⏳ Running Daily Scheduler (00:00 IST)");
        await activateScheduledAds();
        await expireAds();
      },
      { timezone: "UTC" }
    );

    console.log("✔ Scheduler Enabled — Runs Daily @ 00:00 AM IST");
  },

  runOnce,
};