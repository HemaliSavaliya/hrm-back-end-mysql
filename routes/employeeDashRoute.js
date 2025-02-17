const { fetchLeaveDetails, getUserDetails } = require("../controller/employeeDashController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.get('/user/details', authenticate, getUserDetails);
router.get('/leaves/details', authenticate, fetchLeaveDetails);

module.exports = router;
