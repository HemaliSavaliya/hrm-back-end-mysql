const { login, addSuperAdmin, logout } = require("../controller/authController");
const router = require('express').Router();

router.post('/login', login);
router.post('/logout', logout); // Use the authenticate middleware to logout
router.post('/add-super-admin', addSuperAdmin);

module.exports = router;