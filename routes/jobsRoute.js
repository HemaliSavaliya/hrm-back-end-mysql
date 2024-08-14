const {
  addJob,
  jobsList,
  updateJob,
  deleteJobs,
} = require("../controller/jobsController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-job", authenticate, addJob);
router.put("/update-job/:id", authenticate, updateJob);
router.delete("/delete-job/:id", authenticate, deleteJobs);
router.get("/jobsList", authenticate, jobsList);

module.exports = router;
