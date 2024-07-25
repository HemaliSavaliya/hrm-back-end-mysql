const { addDesignation, updateStatus, designationList } = require('../controller/designationController');
const { authenticate } = require('../utils/authMiddleware');
const router = require('express').Router();

router.post("/add-designation", authenticate, addDesignation);
router.put("/designation-update-status/:id", authenticate, updateStatus);
router.get("/designation-list", authenticate, designationList);

module.exports = router;