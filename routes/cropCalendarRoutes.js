const express = require("express");
const router = express.Router();
const cropCalendarController = require("../controllers/cropCalendarController");

router.post("/", cropCalendarController.createCropCalendar);
router.get("/", cropCalendarController.getCropCalendars);
router.put("/:id", cropCalendarController.updateCropCalendar);
router.delete("/:id", cropCalendarController.deleteCropCalendar);

module.exports = router;
