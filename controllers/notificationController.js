const UserFcmToken = require("../models/userFcmTokenModel");
const NotificationLog = require("../models/notificationLogModel");
const { getMessaging, initFirebase } = require("../services/firebaseService");

initFirebase(); // ensure initialized

async function sendFirebaseMulticast(tokens = [], title, description, data = {}) {
  console.log("\n=============== FCM SEND START ===============");
  console.log("📌 Total Tokens to Send:", tokens.length);
  console.log("📌 Title:", title);
  console.log("📌 Description:", description);
  console.log("📌 Data Payload:", data);

  if (!tokens || !tokens.length) {
    console.warn("⚠️ No tokens found, skipping push notification");
    return { successCount: 0, failureCount: 0, results: [] };
  }

  const messaging = getMessaging();
  const chunkSize = 500;
  const chunks = [];
  for (let i = 0; i < tokens.length; i += chunkSize)
    chunks.push(tokens.slice(i, i + chunkSize));

  let totalSuccess = 0;
  let totalFailure = 0;
  const allResults = [];

  for (const chunk of chunks) {
    console.log(`🚀 Sending to chunk (${chunk.length} tokens)...`);

    const message = {
      tokens: chunk,
      notification: { title, body: description },
      data: { ...data },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    };

    const resp = await messaging.sendEachForMulticast(message);
    console.log(`📊 Chunk Result: success=${resp.successCount}, failure=${resp.failureCount}`);

    // 🔥 Token validation cleanup
    for (let i = 0; i < resp.responses.length; i++) {
      const result = resp.responses[i];
      if (result.error) {
        console.warn("⚠️ Token Failed:", chunk[i], result.error.code);

        const invalidErrors = [
          "messaging/registration-token-not-registered",
          "messaging/invalid-registration-token"
        ];

        if (invalidErrors.includes(result.error.code)) {
          console.log("🗑 Removing invalid token from DB:", chunk[i]);
          await UserFcmToken.deleteToken(chunk[i]);
        }
      }
    }

    totalSuccess += resp.successCount;
    totalFailure += resp.failureCount;
    allResults.push(...resp.responses);
  }

  console.log("=============== FCM SEND END =================");
  console.log("✨ FINAL RESULTS => Success:", totalSuccess, "Failure:", totalFailure);

  return { successCount: totalSuccess, failureCount: totalFailure, results: allResults };
}


// save token
exports.saveToken = async (req, res) => {
  try {
    const { user_id, fcm_token } = req.body;
    console.log("\n🔔 Save Token Request:", { user_id, fcm_token });

    if (!user_id || !fcm_token) {
      console.warn("❌ Missing user_id or fcm_token");
      return res.status(400).json({ message: "user_id and fcm_token required" });
    }

    const saved = await UserFcmToken.upsertToken(user_id, fcm_token);
    console.log("✅ Token Saved/Updated:", saved);

    return res.json({ message: "Token saved", token: saved });
  } catch (err) {
    console.error("🔥 saveToken error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// send to all users
exports.sendToAll = async (req, res) => {
  try {
    const { title, description, created_by, created_by_name, districts = [], payload } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title & description required" });
    }

    let tokens = [];

    // 🎯 Condition Check
    if (districts.length > 0) {
      console.log("📌 Sending only to districts:", districts);
      tokens = await UserFcmToken.getTokensByDistricts(districts);
    } else {
      console.log("📌 Sending to ALL users");
      tokens = await UserFcmToken.getAllTokens();
    }

    if (!tokens.length) {
      return res.status(200).json({
        message: "No users found for selected criteria",
        recipients: 0
      });
    }

    const sendResp = await sendFirebaseMulticast(
      tokens,
      title,
      description,
      payload || {}
    );

    await NotificationLog.createLog({
      title,
      description,
      created_by,
      created_by_name,
      type: districts.length > 0 ? "district-targeted" : "general",
      target_info: districts.length > 0 ? { districts } : null,
      recipients_count: tokens.length,
      payload: sendResp
    });

    return res.json({
      message: "Notification sent successfully",
      recipients: tokens.length,
      result: sendResp
    });

  } catch (err) {
    console.error("🔥 sendToAll Error:", err);
    return res.status(500).json({ message: "Server Error", error: err.message });
  }
};


// send targeted
exports.sendTargeted = async (req, res) => {
  try {
    console.log("\n🎯 Sending TARGETED Notification");
    console.log("Request Body:", req.body);

    const { title, description, districts, product_id, created_by, created_by_name, payload } = req.body;

    if (!title || !description || !districts || !product_id) {
      console.warn("❌ Missing required target fields");
      return res.status(400).json({ message: "title, description, districts and product_id required" });
    }

    const tokens = await UserFcmToken.getTokensForDistrictsAndProduct(districts, Number(product_id));
    console.log("📌 Targeted Tokens Found:", tokens.length);
    console.log("📌 Districts:", districts);
    console.log("📌 Product ID:", product_id);

    const sendResp = await sendFirebaseMulticast(
      tokens,
      title,
      description,
      payload || { product_id: String(product_id) }
    );

    console.log("📩 Targeted Delivery Report:", sendResp);

    await NotificationLog.createLog({
      title, description, created_by, created_by_name,
      type: "targeted",
      target_info: { districts, product_id },
      recipients_count: tokens.length,
      payload: sendResp
    });

    return res.json({ message: "Targeted notification sent", result: sendResp });
  } catch (err) {
    console.error("🔥 sendTargeted error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    console.log("\n📜 Fetching Notification Logs");
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    console.log("Pagination =>", { limit, offset });

    const logs = await NotificationLog.getLogs(limit, offset);
    console.log("Logs Found:", logs.length);

    return res.json(logs);
  } catch (err) {
    console.error("🔥 getLogs error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
