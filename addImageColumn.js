const pool = require("./config/db"); // PostgreSQL connection from your config 

(async () => {
  try {
    // ✅ Alter table to match new model
    const alterQueries = [
      // Add 'upload' column if not exists
      `ALTER TABLE crop_calendars
       ADD COLUMN IF NOT EXISTS upload TEXT;`,

      // Ensure 'sub_category' and 'product' are NOT NULL
      `ALTER TABLE crop_calendars
       ALTER COLUMN sub_category SET NOT NULL;`,

      `ALTER TABLE crop_calendars
       ALTER COLUMN product SET NOT NULL;`,

      // Add JSONB columns if not exists
      `ALTER TABLE crop_calendars
       ADD COLUMN IF NOT EXISTS cultivation_tips JSONB;`,

      `ALTER TABLE crop_calendars
       ADD COLUMN IF NOT EXISTS paste_and_diseases JSONB;`,

      `ALTER TABLE crop_calendars
       ADD COLUMN IF NOT EXISTS stages_selection JSONB;`,

      // Drop old typo column if exists
      `ALTER TABLE crop_calendars
       DROP COLUMN IF EXISTS paste_and_decies;`,

      // Update default timestamps if needed
      `ALTER TABLE crop_calendars
       ALTER COLUMN created_at SET DEFAULT NOW();`,

      `ALTER TABLE crop_calendars
       ALTER COLUMN updated_at SET DEFAULT NOW();`
    ];

    for (const query of alterQueries) {
      await pool.query(query);
    }

    console.log("✅ 'crop_calendars' table altered successfully!");
  } catch (err) {
    console.error("❌ Error altering crop_calendars table:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
