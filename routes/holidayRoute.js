const {
  addHoliday,
  updateHoliday,
  deleteHoliday,
  holidayList,
} = require("../controller/holidayController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-holiday", authenticate, addHoliday);
router.put("/update-holiday/:id", authenticate, updateHoliday);
router.delete("/delete-holiday/:id", authenticate, deleteHoliday);
router.get("/holiday-list", authenticate, holidayList);

module.exports = router;
