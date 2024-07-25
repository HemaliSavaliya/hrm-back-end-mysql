const { addCompany, updateCompany, deleteCompany, companyList, getCompanyLogo } = require('../controller/companyController');
const { authenticate } = require('../utils/authMiddleware');
const router = require('express').Router();

router.post("/add-company", authenticate, addCompany);
router.put("/update-company/:id", authenticate, updateCompany);
router.delete("/delete-company/:id", authenticate, deleteCompany);
router.get("/company-list", authenticate, companyList);
router.get("/company-logo/:companyId", getCompanyLogo);

module.exports = router;