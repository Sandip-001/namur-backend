// jobs/adScheduler.js
const cron = require("node-cron");
const pool = require("../config/db");
const Ad = require("../models/adModel");
const AdLogs = require("../models/AdLogs");

/**
 * Helper: Get today's date in IST (no time)
 * Example: '2025-11-24'
 */
function getTodayIST() {
  const todayIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  todayIST.setHours(0, 0, 0, 0);
  return todayIST.toISOString().split("T")[0];
}

/**
 * 1️⃣ Activate ads scheduled for today (schedule_at = today's date)
 */
async function activateScheduledAds() {
  try {
    const today = getTodayIST(); // yyyy-mm-dd

    const { rows } = await pool.query(
      `SELECT * FROM ads 
       WHERE post_type = 'schedule'
       AND status = 'pending'
       AND DATE(scheduled_at AT TIME ZONE 'Asia/Kolkata') = $1`,
      [today]
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

    console.log(`✔ Activated ${rows.length} scheduled ads`);
  } catch (err) {
    console.error("activateScheduledAds error:", err);
  }
}

/**
 * Logic: expiry_date < TOMORROW (not <= today)
 */
async function expireAds() {
  try {
    const today = getTodayIST(); // yyyy-mm-dd

    const { rows } = await pool.query(
      `SELECT * FROM ads 
   WHERE expiry_date IS NOT NULL
   AND DATE(expiry_date AT TIME ZONE 'Asia/Kolkata') = $1`,
      [today]
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

    console.log(`✔ Expired ${rows.length} ads`);
  } catch (err) {
    console.error("expireAds error:", err);
  }
}

async function runOnce() {
  console.log("🔄 Manually triggering scheduler...");
  await activateScheduledAds();
  await expireAds();
  console.log("✔ Manual scheduler run complete");
}

module.exports = {
  start: () => {
    /**
     * RUN DAILY AT 00:00 AM IST
     * UTC = IST - 5:30
     * 00:00 IST = 18:30 UTC (previous day)
     */
    cron.schedule(
      "30 18 * * *",
      async () => {
        console.log("⏳ Running ad scheduler (00:00 AM IST)");
        await activateScheduledAds();
        await expireAds();
      },
      { timezone: "UTC" }
    );

    console.log("✔ Ad Scheduler started (Runs daily at 00:00 AM IST)");
  },

  runOnce,
};
