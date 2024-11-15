const {
  addAdmin,
  updateAdmin,
  deleteAdmin,
  adminListActive,
  adminListInactive,
} = require("../controller/adminController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-admin", authenticate, addAdmin);
router.put("/update-admin/:id", authenticate, updateAdmin);
router.delete("/delete-admin/:id", authenticate, deleteAdmin);
router.get("/admin-active-list", authenticate, adminListActive);
router.get("/admin-inactive-list", authenticate, adminListInactive);

module.exports = router;
