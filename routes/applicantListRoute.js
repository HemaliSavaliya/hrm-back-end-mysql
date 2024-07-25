const { applicantList } = require('../controller/applicantListController');
const router = require("express").Router();

// router.post("/add-applicant-list", addApplicantList);
router.get("/applicant-list", applicantList);

module.exports = router;