const pool = require("../config/db");
const bwipjs = require("bwip-js");
const QRCode = require("qrcode");

exports.getQRCodeImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(
      "SELECT barcode_value FROM users WHERE id=$1",
      [id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const code = userResult.rows[0].barcode_value;
    const redirectUrl = `https://namur-agriculture-admin.vercel.app/scan?code=${code}`;

    const qr = await QRCode.toBuffer(redirectUrl);

    res.set("Content-Type", "image/png");
    res.send(qr);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.scanBarcode = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      "SELECT username, mobile FROM users WHERE barcode_value=$1",
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Invalid Barcode" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




/*exports.getBarcodeImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(
      "SELECT barcode_value FROM users WHERE id=$1",
      [id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const barcodeValue = userResult.rows[0].barcode_value;
    const redirectUrl = `https://namur-agriculture-admin.vercel.app/scan?code=${barcodeValue}`;

    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: redirectUrl, // value that scanner reads
        scale: 3,
        height: 6,

        // Do NOT include text by default (so URL is not shown)
        includetext: false,

        // Show ONLY the barcode value as readable text
        alttext: barcodeValue,
        alttextxalign: "center",
        alttextfont: "Helvetica", // cleaner font
        alttextsize: 14, // bigger for readability
        alttextyoffset: -8, // adjust spacing below barcode
      },
      (err, png) => {
        if (err) return res.status(500).json({ message: err.message });
        res.set("Content-Type", "image/png");
        res.send(png);
      }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};*/