const {
  expiringSubscriptions,
  getNotification,
  deleteNotification,
} = require("../controller/reminderController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.get("/expiring-subscriptions", authenticate, expiringSubscriptions);
router.get("/get-notification", authenticate, getNotification);
router.delete("/delete-notification/:id", authenticate, deleteNotification);

module.exports = router;
