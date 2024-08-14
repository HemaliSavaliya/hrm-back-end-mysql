const {
  addAwards,
  awardsList,
  updateAwards,
  deleteAwards,
} = require("../controller/awardsController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-awards", authenticate, addAwards);
router.put("/update-awards/:id", authenticate, updateAwards);
router.delete("/delete-awards/:id", authenticate, deleteAwards);
router.get("/awardsList", authenticate, awardsList);

module.exports = router;
