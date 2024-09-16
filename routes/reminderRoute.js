const {
  expiringSubscriptions,
  getNotification,
} = require("../controller/reminderController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.get("/expiring-subscriptions", authenticate, expiringSubscriptions);
router.get("/get-notification", authenticate, getNotification);

module.exports = router;
