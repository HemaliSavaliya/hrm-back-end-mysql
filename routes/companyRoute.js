const {
  addCompany,
  updateCompany,
  deleteCompany,
  getCompanyLogo,
  companyListActive,
  companyListInactive,
  companyAllList,
  renewSubscription,
} = require("../controller/companyController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-company", authenticate, addCompany);
router.post("/renew-subscription/:id", authenticate, renewSubscription);
router.put("/update-company/:id", authenticate, updateCompany);
router.delete("/delete-company/:id", authenticate, deleteCompany);
router.get("/company-list", authenticate, companyAllList);
router.get("/company-active-list", authenticate, companyListActive);
router.get("/company-inactive-list", authenticate, companyListInactive);
router.get("/company-logo/:companyId", getCompanyLogo);

module.exports = router;
