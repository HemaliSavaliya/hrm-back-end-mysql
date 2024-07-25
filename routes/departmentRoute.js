const { addDepartment, departmentList, updateStatus, updateDepartment } = require("../controller/departmentController");
const { authenticate } = require('../utils/authMiddleware');
const router = require("express").Router();

router.post("/add-department", authenticate, addDepartment);
router.put("/update-department/:id", authenticate, updateDepartment);
router.put("/department-update-status/:id", authenticate, updateStatus);
router.get("/department-list", authenticate, departmentList);

module.exports = router;