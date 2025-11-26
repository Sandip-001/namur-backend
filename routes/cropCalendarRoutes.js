const express = require("express");
const router = express.Router();
const cropCalendarController = require("../controllers/cropCalendarController");

router.post("/", cropCalendarController.createCropCalendar);
router.get("/", cropCalendarController.getCropCalendars);
router.get("/product/:product_id", cropCalendarController.getCropCalendarByProductId);
router.put("/:id", cropCalendarController.updateCropCalendar);
router.delete("/:id", cropCalendarController.deleteCropCalendar);

module.exports = router;