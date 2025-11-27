const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");


router.post("/save-token", notificationController.saveToken);

// admin routes (protect with admin middleware)
router.post("/send-all", notificationController.sendToAll);
router.post("/send-target", notificationController.sendTargeted);
router.get("/logs", notificationController.getLogs);

module.exports = router;