const {
  forgotPassword,
  resetPassword,
} = require("../controller/forgotPasswordController");
const router = require("express").Router();

router.post("/forgot-password-link", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
