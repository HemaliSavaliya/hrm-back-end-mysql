const { addAdmin, updateAdmin, deleteAdmin, adminList } = require("../controller/adminController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-admin", authenticate, addAdmin);
router.put("/update-admin/:id", authenticate, updateAdmin);
router.delete("/delete-admin/:id", authenticate, deleteAdmin);
router.get("/adminList", authenticate, adminList);

module.exports = router;