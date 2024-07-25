const { addEmp, updateEmp, deleteEmp, empList, empListById, updatePassword, forgotPassword, getEmpDocument, deleteDocument } = require('../controller/userController');
const { authenticate } = require('../utils/authMiddleware');
const router = require('express').Router();

router.post("/add-emp", authenticate, addEmp);
router.post("/update-password", authenticate, updatePassword);
router.post("/forgot-password", authenticate, forgotPassword);
router.put("/update-emp/:id", authenticate, updateEmp);
router.delete("/delete-emp/:id", authenticate, deleteEmp);
router.delete("/delete-emp-document/:id", authenticate, deleteDocument);
router.get("/empList", authenticate, empList);
router.get("/profile/:id", authenticate, empListById);
router.get("/employee-document/:documentName", authenticate, getEmpDocument);

module.exports = router;