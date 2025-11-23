// jobs/adScheduler.js
const cron = require("node-cron");
const pool = require("../config/db");
const Ad = require("../models/adModel");
const AdLogs = require("../models/AdLogs");

// Helper to activate scheduled ads where scheduled_at is today (00:00)
async function activateScheduledAds() {
  try {
    const todayIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    todayIST.setHours(0, 0, 0, 0);

    const { rows } = await pool.query(
      `SELECT * FROM ads WHERE post_type='schedule' AND status='pending' AND DATE(scheduled_at AT TIME ZONE 'Asia/Kolkata') = $1`,
      [todayIST.toISOString().split("T")[0]]
    );

    for (const ad of rows) {
      await Ad.activateAd(ad.id);
      await AdLogs.createLog({
        ad_id: ad.id,
        action: "activate_scheduled",
        actor_name: "system",
        actor_role: "system",
        payload: { scheduled_at: ad.scheduled_at },
      });
    }
  } catch (err) {
    console.error("activateScheduledAds error:", err);
  }
}

// Helper to expire ads where expiry_date <= today (delete)
async function expireAds() {
  try {
    const todayIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    todayIST.setHours(0, 0, 0, 0);

    const istDate = todayIST.toISOString().split("T")[0];

    const { rows } = await pool.query(
      `SELECT * FROM ads 
       WHERE expiry_date IS NOT NULL 
       AND DATE(expiry_date AT TIME ZONE 'Asia/Kolkata') <= $1`,
      [istDate]
    );

    for (const ad of rows) {
      await AdLogs.createLog({
        ad_id: ad.id,
        action: "auto_expired",
        actor_name: "system",
        actor_role: "system",
        payload: ad,
      });

      await pool.query("DELETE FROM ads WHERE id=$1", [ad.id]);
    }
  } catch (err) {
    console.error("expireAds error:", err);
  }
}

module.exports = {
  start: () => {
    cron.schedule("35 18 * * *", async () => {
      console.log("Running ad scheduler at 12:05 AM IST");
      await activateScheduledAds();
      await expireAds();
    });
    console.log("Ad scheduler started (daily at 12:05 IST)");
  },
};
