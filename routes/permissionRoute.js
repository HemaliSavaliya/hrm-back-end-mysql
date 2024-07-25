const { addPermission, deletePermission, getPermission } = require("../controller/permissionController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-permission", authenticate, addPermission);
router.post("/delete-permission", authenticate, deletePermission);
router.get("/get-permission", authenticate, getPermission);

module.exports = router;