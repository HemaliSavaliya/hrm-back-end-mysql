const {
  addTimerData,
  timerList,
  timerListRoleWise,
} = require("../controller/timerController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-timer", authenticate, addTimerData);
router.get("/timer-list", authenticate, timerList);
router.get("/timer-list-role", authenticate, timerListRoleWise);

module.exports = router;
