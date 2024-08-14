const {
  addProjects,
  projectsList,
  updateProject,
  deleteProject,
  updateStatus,
  getDocument,
  deleteDocument,
} = require("../controller/projectController");
const { authenticate } = require("../utils/authMiddleware");
const router = require("express").Router();

router.post("/add-projects", authenticate, addProjects);
router.put("/update-project/:id", authenticate, updateProject);
router.put("/update-status/:id", authenticate, updateStatus);
router.delete("/delete-project/:id", authenticate, deleteProject);
router.delete("/delete-project-document/:id", authenticate, deleteDocument);
router.get("/projects-list", authenticate, projectsList);
router.get("/projects-document/:documentName", authenticate, getDocument);

module.exports = router;
