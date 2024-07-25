const { addLeaveType, leaveTypeList, updateLeaveType, deleteLeaveType, updateLeaveStatus } = require('../controller/leaveTypeController');
const { authenticate } = require('../utils/authMiddleware');
const router = require('express').Router();

router.post("/add-leaveType", authenticate, addLeaveType);
router.put("/update-leaveType/:id", authenticate, updateLeaveType);
router.put("/leave-update-status/:id", authenticate, updateLeaveStatus);
router.delete("/delete-leaveType/:id", authenticate, deleteLeaveType);
router.get("/leaveTypeList", authenticate, leaveTypeList);

module.exports = router;