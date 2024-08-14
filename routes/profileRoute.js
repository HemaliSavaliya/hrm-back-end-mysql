const {
  profile,
  resetProfileImage,
  getProfileImage,
} = require("../controller/profileController");
const router = require("express").Router();

router.post("/add-profile-image", profile);
router.post("/reset-profile-image", resetProfileImage);
router.get("/get-profile-image/:id/:role", getProfileImage);

module.exports = router;
