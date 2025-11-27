// controllers/notificationController.js
const UserFcmToken = require("../models/userFcmTokenModel");
const NotificationLog = require("../models/notificationLogModel");
const { getMessaging, initFirebase } = require("../services/firebaseService");

initFirebase(); // ensure initialized

// helper to send via firebase-admin
async function sendFirebaseMulticast(tokens = [], title, description, data = {}) {
  if (!tokens || !tokens.length) return { successCount: 0, failureCount: 0, results: [] };

  const messaging = getMessaging();
  // chunk tokens to 500 each (FCM limit)
  const chunkSize = 500;
  const chunks = [];
  for (let i = 0; i < tokens.length; i += chunkSize) chunks.push(tokens.slice(i, i + chunkSize));

  let totalSuccess = 0;
  let totalFailure = 0;
  const allResults = [];

  for (const chunk of chunks) {
    const message = {
      tokens: chunk,
      notification: { title, body: description },
      data: { ...data },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    };

    const resp = await messaging.sendEachForMulticast(message);
    totalSuccess += resp.successCount;
    totalFailure += resp.failureCount;
    allResults.push(...resp.responses);
  }

  return { successCount: totalSuccess, failureCount: totalFailure, results: allResults };
}

// save token
exports.saveToken = async (req, res) => {
  try {
    const { user_id, fcm_token } = req.body;
    if (!user_id || !fcm_token) return res.status(400).json({ message: "user_id and fcm_token required" });

    const saved = await UserFcmToken.upsertToken(user_id, fcm_token);
    return res.json({ message: "Token saved", token: saved });
  } catch (err) {
    console.error("saveToken error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// send to all users
exports.sendToAll = async (req, res) => {
  try {
    const { title, description, created_by, created_by_name, payload } = req.body;
    if (!title || !description) return res.status(400).json({ message: "title and description required" });

    const tokens = await UserFcmToken.getAllTokens();
    const sendResp = await sendFirebaseMulticast(tokens, title, description, payload || {});

    await NotificationLog.createLog({
      title, description, created_by, created_by_name,
      type: "general",
      target_info: null,
      recipients_count: tokens.length,
      payload: { successCount: sendResp.successCount, failureCount: sendResp.failureCount }
    });

    return res.json({ message: "Notification sent", result: sendResp });
  } catch (err) {
    console.error("sendToAll error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// send targeted (districts + product_id)
exports.sendTargeted = async (req, res) => {
  try {
    const { title, description, districts, product_id, created_by, created_by_name, payload } = req.body;
    if (!title || !description || !districts || !product_id) {
      return res.status(400).json({ message: "title, description, districts and product_id required" });
    }

    // districts expected array
    const tokens = await UserFcmToken.getTokensForDistrictsAndProduct(districts, Number(product_id));
    const sendResp = await sendFirebaseMulticast(tokens, title, description, payload || { product_id: String(product_id) });

    await NotificationLog.createLog({
      title, description, created_by, created_by_name,
      type: "targeted",
      target_info: { districts, product_id },
      recipients_count: tokens.length,
      payload: { successCount: sendResp.successCount, failureCount: sendResp.failureCount }
    });

    return res.json({ message: "Targeted notification sent", result: sendResp });
  } catch (err) {
    console.error("sendTargeted error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const logs = await NotificationLog.getLogs(limit, offset);
    return res.json(logs);
  } catch (err) {
    console.error("getLogs error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};