// controllers/landMapController.js
const fs = require("fs");
const xlsx = require("xlsx");
const LandMap = require("../models/landMapModel");
const pool = require("../config/db");

/**
 * Utility: extract coordinate pairs from messy string and produce:
 * - coordsLatLng: [[lat,lng], ...]  (lat first)  ---> for coords_latlng JSONB
 * - geomWKT: POLYGON((lng lat, lng lat, ...)) -> for PostGIS
 */
function parseCoordinatesString(s) {
  if (!s || typeof s !== "string") return { coordsLatLng: [], geomWKT: null };

  // remove trailing characters often seen: "]] } }" etc
  // keep only bracketed pairs `[ num , num ]` sequences
  const pairRegex =
    /\[\s*([+-]?\d+(\.\d+)?(?:[eE][+-]?\d+)?)\s*,\s*([+-]?\d+(\.\d+)?(?:[eE][+-]?\d+)?)\s*\]/g;
  const pairs = [];
  let m;
  while ((m = pairRegex.exec(s))) {
    // m[1] = first number (lng in input), m[3] = second number (lat in input)
    const lng = parseFloat(m[1]);
    const lat = parseFloat(m[3]);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    pairs.push([lat, lng]); // store lat,lng for frontend JSON
  }

  if (pairs.length === 0) return { coordsLatLng: [], geomWKT: null };

  // ensure polygon closed: last equals first
  const first = pairs[0];
  const last = pairs[pairs.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    // close polygon by repeating first
    pairs.push([first[0], first[1]]);
  }

  // Build WKT: needs lng lat order
  const wktCoords = pairs.map(([lat, lng]) => `${lng} ${lat}`).join(", ");
  const geomWKT = `POLYGON((${wktCoords}))`;

  return { coordsLatLng: pairs, geomWKT };
}

/**
 * Detection: map excel header names to fields we want.
 * We'll try to detect by header text, else use provided fallback indexes.
 */
function mapRowByHeader(headers, row) {
  // lowercase headers
  const low = headers.map((h) => (h || "").toString().trim().toLowerCase());
  const findIndex = (keys) => {
    for (const k of keys) {
      const idx = low.findIndex((h) => h.includes(k));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  // possible header keywords
  const idxTaluk = findIndex(["taluk"]);
  const idxHobli = findIndex(["hobli"]);
  const idxHissa = findIndex(["hissa"]);
  const idxArea = findIndex(["area", "acres"]);
  const idxFid = findIndex(["fid"]);
  const idxDistrict = findIndex(["district", "dist"]);
  const idxSurvey = findIndex(["sy", "survey", "sy no", "slr", "102_sslr"]);
  const idxGeom = findIndex(["coordinates", "geom", "shape", "geometry"]);
  // Find correct village name column FIRST
  let idxVillage = low.findIndex(
    (h) => h === "103_village" || h === "village name"
  );

  // If not found, fallback to partial match
  if (idxVillage < 0) {
    // But exclude any headers containing "code"
    idxVillage = low.findIndex(
      (h) => h.includes("village") && !h.includes("code")
    );
  }

  return {
    district: idxDistrict >= 0 ? row[idxDistrict] : null,
    taluk: idxTaluk >= 0 ? row[idxTaluk] : null,
    hobli: idxHobli >= 0 ? row[idxHobli] : null,
    village: idxVillage >= 0 ? row[idxVillage] : null,
    survey_no: idxSurvey >= 0 ? row[idxSurvey] : null,
    hissa_no: idxHissa >= 0 ? row[idxHissa] : null,
    area_acres: idxArea >= 0 ? row[idxArea] : null,
    fid_code: idxFid >= 0 ? row[idxFid] : null,
    geometry_raw: idxGeom >= 0 ? row[idxGeom] : null,
  };
}

exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // read workbook
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "Empty sheet" });
    }

    // first row assumed headers (if header-like). If not, you may need to change logic.
    const headers = rows[0].map((h) => (h || "").toString().trim());
    const dataRows = rows.slice(1);

    const inserted = [];
    const skipped = [];

    // process rows
    for (const row of dataRows) {
      if (!row || row.length === 0) continue;

      const mapped = mapRowByHeader(headers, row);

      // fallback: if geometry_raw null attempt last column string
      const rawGeom = mapped.geometry_raw || row[row.length - 1] || "";

      // parse coords
      const { coordsLatLng, geomWKT } = parseCoordinatesString(rawGeom);

      // Normalize strings
      const district = (mapped.district || "").toString().trim();
      const taluk = (mapped.taluk || "").toString().trim();
      const village = (mapped.village || "").toString().trim();
      const survey_no = mapped.survey_no
        ? mapped.survey_no.toString().trim()
        : null;
      const hissa_no = mapped.hissa_no
        ? mapped.hissa_no.toString().trim()
        : null;

      // Skip rows if coordsLatLng empty
      if (!district || !taluk || !village || coordsLatLng.length < 3) {
        skipped.push({
          row,
          reason: "missing required fields or polygon coords",
        });
        continue;
      }

      // Duplicate check (option A)
      const existingId = await LandMap.existsByIdentity({
        district,
        taluk,
        village,
        survey_no,
        hissa_no,
      });
      if (existingId) {
        skipped.push({
          row,
          reason: "duplicate found (by identity)",
          existingId,
        });
        continue;
      }

      // All good - insert
      const saved = await LandMap.create({
        district,
        taluk,
        hobli: mapped.hobli,
        village,
        survey_no,
        hissa_no,
        fid_code: mapped.fid_code,
        area_acres: mapped.area_acres ? Number(mapped.area_acres) : null,
        geom_type: "Polygon",
        coordsLatLng,
        geomWKT,
      });

      inserted.push(saved);
    }

    return res.json({
      message: "Upload processed",
      inserted: inserted.length,
      skipped,
      insertedRows: inserted,
    });
  } catch (err) {
    console.error("uploadExcel error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const list = await LandMap.getAll();
    return res.json(list);
  } catch (err) {
    console.error("getAll error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    const result = await LandMap.deleteById(id);
    return res.json(result);
  } catch (err) {
    console.error("delete error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// Case-insensitive matching API
exports.getMatchedLandData = async (req, res) => {
  try {
    const query = `
  SELECT 
    u.id AS user_id,
    u.username,
    u.mobile,
    u.profile_image_url,

    l.id AS land_id,
    l.land_name,
    l.district AS land_district,
    l.taluk AS land_taluk,
    l.village AS land_village,
    l.survey_no,
    l.hissa_no,
    l.farm_size,

    lm.area_acres,
    lm.coords_latlng,

    p.name AS product_name,
    p.image_url AS product_image,
    lp.acres AS product_acres,

    c.name AS category_name,
    s.name AS subcategory_name

  FROM lands l
  JOIN users u ON u.id = l.user_id

  -- STRICT LAND MAP MATCHING
  JOIN land_maps lm ON 
    LOWER(l.district) = LOWER(lm.district) AND
    LOWER(l.taluk) = LOWER(lm.taluk) AND
    LOWER(l.village) = LOWER(lm.village) AND
    LOWER(l.survey_no) = LOWER(lm.survey_no) AND
    LOWER(l.hissa_no) = LOWER(lm.hissa_no)

  LEFT JOIN land_products lp ON lp.land_id = l.id
  LEFT JOIN products p ON p.id = lp.product_id
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN subcategories s ON p.subcategory_id = s.id

  -- Ensure only FOOD category products
  WHERE LOWER(c.name) = 'food'
`;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matched lands found",
      });
    }

    // Group multiple products under each land
    const groupedData = {};
    result.rows.forEach((row) => {
      if (!groupedData[row.land_id]) {
        groupedData[row.land_id] = {
          user_id: row.user_id,
          username: row.username,
          mobile: row.mobile,
          profile_image_url: row.profile_image_url,

          land_id: row.land_id,
          land_name: row.land_name,
          district: row.land_district,
          taluk: row.land_taluk,
          village: row.land_village,
          survey_no: row.survey_no,
          hissa_no: row.hissa_no,
          farm_size: row.farm_size,

          area_acres_from_map: row.area_acres,
          coordinates: row.coords_latlng,

          food_products: [],
        };
      }

      if (row.product_name) {
        groupedData[row.land_id].food_products.push({
          product_name: row.product_name,
          product_image: row.product_image,
          acres: row.product_acres,
          category_name: row.category_name,
          subcategory_name: row.subcategory_name,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Matched land data retrieved successfully",
      data: Object.values(groupedData),
    });
  } catch (error) {
    console.error("Matching API Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
