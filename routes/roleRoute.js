const { addRole, updateRoleStatus, roleList, getAllRolesName } = require('../controller/roleController');
const { authenticate } = require('../utils/authMiddleware');
const router = require('express').Router();

router.post("/add-role", authenticate, addRole);
router.put("/update-role-status/:id", authenticate, updateRoleStatus);
router.get("/role-list", authenticate, roleList);
router.get("/get-role-name", authenticate, getAllRolesName);

module.exports = router;