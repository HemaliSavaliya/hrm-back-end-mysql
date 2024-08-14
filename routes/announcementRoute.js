const {
  addAnnouncement,
  announcementList,
  updateAnnouncement,
  deleteAnnouncement,
  getDocument,
  deleteDocument,
} = require("../controller/announcementController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-announcement", authenticate, addAnnouncement);
router.put("/update-announcement/:id", authenticate, updateAnnouncement);
router.delete("/delete-announcement/:id", authenticate, deleteAnnouncement);
router.delete("/delete-document/:id", authenticate, deleteDocument);
router.get("/announcementList", authenticate, announcementList);
router.get("/anno-document/:documentName", authenticate, getDocument);

module.exports = router;
