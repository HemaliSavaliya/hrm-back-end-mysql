const connection = require("../config/config");
const multer = require("multer");
const ftp = require("basic-ftp");
const mime = require("mime-types");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "upload/project_doc");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage }).array("document[]", 5);

// Function to upload file to FTP server
async function uploadProjectFileToFtp(files) {
  const client = new ftp.Client();

  try {
    await client.access({
      host: process.env.FTP_HOST_NAME,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
    });

    for (const file of files) {
      const localFilePath = `./upload/project_doc/${file.filename}`;
      const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/project_document/${file.filename}`;

      await client.uploadFrom(localFilePath, remoteFilePath);

      // console.log(`${localFilePath} uploaded successfully`);
    }
  } catch (error) {
    console.error("Error uploading project files to FTP:", error);
    throw error;
  } finally {
    client.close();
  }
}

// Function to download file from FTP server
async function downloadFileFromFTP(res, filename) {
  const client = new ftp.Client();
  const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/project_document/${filename}`;

  try {
    await client.access({
      host: process.env.FTP_HOST_NAME,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
    });

    // Determine the MIME type based on the file extension
    const contentType = mime.lookup(filename) || "application/octet-stream";

    // Set appropriate HTTP headers to serve the file
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Stream the file directly from the FTP server to the HTTP response
    await client.downloadTo(res, remoteFilePath);
  } catch (error) {
    console.error(`Error downloading file:`, error);
    throw error;
  } finally {
    client.close();
  }
}

module.exports.addProjects = async (req, res) => {
  try {
    // Check if the user making the request is an admin
    if (req.user && req.user.role === "Admin") {
      // Multer middleware to process the file upload
      upload(req, res, async function (err) {
        if (err) {
          console.error("Error uploading project file", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        // Convert startDate to the desired format
        const startDate = new Date(req.body.startDate);
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const monthAbbreviation = monthNames[startDate.getMonth()];
        const startDateFormatted = `${startDate.getDate()} ${monthAbbreviation} ${startDate.getFullYear()}`;

        // Convert endDate to the same format as startDate
        let endDateFormatted = null;
        if (req.body.endDate) {
          const endDate = new Date(req.body.endDate);
          const endMonthAbbreviation = monthNames[endDate.getMonth()];
          endDateFormatted = `${endDate.getDate()} ${endMonthAbbreviation} ${endDate.getFullYear()}`;
        }

        // Serialize arrays to JSON strings
        const teamMembersArray = Array.isArray(req.body.teamMembers)
          ? req.body.teamMembers
          : [];
        const teamMembersJSON = JSON.stringify(
          teamMembersArray.map((member) => member.name)
        );
        const userIdJSON = JSON.stringify(
          teamMembersArray.map((member) => parseInt(member.id))
        );

        // Insert new project into the database
        const addProjectQuery =
          "INSERT INTO hrm_projects (companyId, projectName, clientName, clientEmail, startDate, endDate, status, teamMembers, userId, document, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        const params = [
          req.user.companyId,
          req.body.projectName,
          req.body.clientName,
          req.body.clientEmail,
          startDateFormatted,
          endDateFormatted,
          req.body.status,
          teamMembersJSON,
          userIdJSON,
          JSON.stringify(req.files.map((file) => file.filename)), // Store filenames as JSON array in the database
          false,
        ];

        connection.query(addProjectQuery, params, async (err, result) => {
          if (err) {
            console.error("Error adding project:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          try {
            await uploadProjectFileToFtp(req.files);

            res
              .status(200)
              .json({ success: true, message: "Project added successfully" });
          } catch (error) {
            console.error("Error uploading project file to FTP: " + error);
            return res.status(500).json({ error: "Internal Server Error" });
          }
        });
      });
    } else {
      // User is not an admin, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error Creating Project", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.getDocument = async (req, res) => {
  try {
    // Check if the user making the request is an admin
    if (
      req.user &&
      (req.user.role === "Admin" || req.user.role === "Employee")
    ) {
      const documentName = req.params.documentName;

      await downloadFileFromFTP(res, documentName);
    } else {
      // User is not an admin or HR, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error retrieving Document", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.updateProject = async (req, res) => {
  try {
    // Check if the user making the request is an admin
    if (req.user && req.user.role === "Admin") {
      const projectId = req.params.id;

      upload(req, res, async function (err) {
        if (err) {
          console.error("Error uploading project file", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        // Find the project by ID
        const project = await getProjectById(projectId);

        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        // Update the project information
        project.clientEmail = req.body.clientEmail || project.clientEmail;
// Convert and format the endDate if provided
        let endDateFormatted = project.endDate; // Use the current end date as default
        if (req.body.endDate) {
          const endDate = new Date(req.body.endDate);
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const monthAbbreviation = monthNames[endDate.getMonth()];
          endDateFormatted = `${endDate.getDate()} ${monthAbbreviation} ${endDate.getFullYear()}`;
        }
        project.endDate = endDateFormatted;
        

        project.status = req.body.status || project.status;

        // Update teamMembers if provided and is an array
        if (Array.isArray(req.body.teamMembers)) {
          project.teamMembers = req.body.teamMembers.map(
            (member) => member.name
          );
        }

        // Update userId if provided and is an array
        if (Array.isArray(req.body.userId)) {
          project.userId = req.body.userId.map((member) => parseInt(member));
        }

        // Handle document updates
        if (req.files && req.files.length > 0) {
          // Combine existing documents with new uploaded documents
          let existingDocuments = project.document
            ? JSON.parse(project.document)
            : [];
          const newDocumentFilenames = req.files.map((file) => file.filename);

          // Combine existing documents with new documents
          existingDocuments = existingDocuments.concat(newDocumentFilenames);
          project.document = JSON.stringify(existingDocuments);

          // Upload new files to the FTP server
          try {
            await uploadProjectFileToFtp(req.files);
          } catch (error) {
            console.error(
              "Error uploading project files to FTP server:",
              error
            );
            return res.status(500).json({ error: "Internal Server Error" });
          }
        }

        // Save the updated project
        const updateProjectQuery =
          "UPDATE hrm_projects SET clientEmail = ?, endDate = ?, status = ?, userId = ?, teamMembers = ?, document = ? WHERE id = ?";

        connection.query(
          updateProjectQuery,
          [
            project.clientEmail,
            project.endDate,
            project.status,
            JSON.stringify(project.userId),
            JSON.stringify(project.teamMembers),
            project.document,
            projectId,
          ],
          (err, result) => {
            if (err) {
              console.error("Error updating project:", err);
              return res.status(500).json({ error: "Internal Server Error" });
            }
            res
              .status(200)
              .json({ success: true, message: "Project updated successfully" });
          }
        );
      });
    } else {
      // User is not an admin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error Updating Project", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if the user making the request is an admin
    if (req.user && req.user.role === "Admin") {
      // Update the project status in the database
      const updateStatusQuery =
        "UPDATE hrm_projects SET status = ? WHERE id = ?";

      connection.query(updateStatusQuery, [status, id], (err, result) => {
        if (err) {
          console.error("Error updating project status:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        res.status(200).json({
          success: true,
          message: "Project status updated successfully",
        });
      });
    } else {
      // User is not an admin, deny access
      res.status(403).json({ success: false, message: "Access denied" });
    }
  } catch (error) {
    console.error("Error Updating Project Status", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    // Check if the user making the request is an admin
    if (req.user && req.user.role === "Admin") {
      // Update project status to "Deleted" in the database
      const deleteProjectQuery =
        "UPDATE hrm_projects SET deleted = true WHERE id = ?";

      connection.query(deleteProjectQuery, [projectId], (err, result) => {
        if (err) {
          console.error("Error deleting project:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        res.status(200).json({ message: "Project marked as deleted" });
      });
    } else {
      // User is not an admin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error deleting Project", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.deleteDocument = async (req, res) => {
  try {
    const projectId = req.params.id;
    const documentListToDelete = req.body.document; // This should be an array of document filenames to be deleted

    // Check if the user making the request is an admin
    if (req.user && req.user.role === "Admin") {
      // Fetch the existing announcement document list from the database
      connection.query(
        "SELECT document FROM hrm_projects WHERE id = ?",
        [projectId],
        async (err, results) => {
          if (err) {
            console.error("Error fetching existing document list", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          if (results && results[0] && results[0].document) {
            // Parse the document list
            let existingDocuments = JSON.parse(results[0].document);

            // Filter out the documents to be deleted
            const updatedDocuments = existingDocuments.filter(
              (document) => !documentListToDelete.includes(document)
            );

            // Delete files from FTP server
            try {
              // Delete files from the FTP server
              // await deleteFilesFromFTP(documentListToDelete);

              // Delete files locally
              // deleteFilesLocally(documentListToDelete);

              // Update the announcement in the database
              const updateAnnouncementQuery =
                "UPDATE hrm_projects SET document = ? WHERE id = ?";
              connection.query(
                updateAnnouncementQuery,
                [JSON.stringify(updatedDocuments), projectId],
                (err, result) => {
                  if (err) {
                    console.error("Error updating project:", err);
                    return res
                      .status(500)
                      .json({ error: "Internal Server Error" });
                  }

                  res.status(200).json({
                    success: true,
                    message: "Specified documents deleted successfully",
                  });
                }
              );
            } catch (error) {
              console.error(
                "Error deleting files from FTP server or locally:",
                error
              );
              return res.status(500).json({ error: "Internal Server Error" });
            }
          } else {
            return res.status(404).json({ error: "No documents found" });
          }
        }
      );
    }
  } catch (error) {
    console.error("Error deleting specified document", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.projectsList = async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === "Admin") {
      // Fetch all projects from the database
      const getAllProjectsQuery =
        "SELECT * FROM hrm_projects WHERE deleted = false AND companyId = ?";

      connection.query(
        getAllProjectsQuery,
        [req.user.companyId],
        (err, result) => {
          if (err) {
            console.error("Error fetching projects:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }
          // Deserialize teamMembers and userId from JSON strings to arrays
          result.forEach((project) => {
            project.teamMembers = JSON.parse(project.teamMembers);
            project.userId = JSON.parse(project.userId);
          });

          // Convert the document field to an array
          result.forEach((result) => {
            result.document = JSON.parse(result.document);
          });

          res.status(200).json(result);
        }
      );
    } else if (role === "Employee") {
      // Fetch active projects for the employee from the database
      const getEmployeeProjectsQuery =
        "SELECT * FROM hrm_projects WHERE JSON_CONTAINS(userId, ?) AND status = ? AND deleted = false AND companyId = ?";

      connection.query(
        getEmployeeProjectsQuery,
        [`${id}`, "Active", req.user.companyId],
        (err, result) => {
          if (err) {
            console.error("Error fetching employee projects:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }
          // Deserialize teamMembers and userId from JSON strings to arrays
          result.forEach((project) => {
            project.teamMembers = JSON.parse(project.teamMembers);
            project.userId = JSON.parse(project.userId);
          });

          // Convert the document field to an array
          result.forEach((result) => {
            result.document = JSON.parse(result.document);
          });

          res.status(200).json(result);
        }
      );
    }
  } catch (error) {
    console.error("Error Fetching Projects:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Function to get project by ID
function getProjectById(id) {
  return new Promise((resolve, reject) => {
    const getProjectQuery = "SELECT * FROM hrm_projects WHERE id = ?";
    connection.query(getProjectQuery, [id], (err, result) => {
      if (err) {
        console.error("Error fetching project by ID:", err);
        reject(err);
      } else if (result.length === 0) {
        resolve(null); // Project not found
      } else {
        // Deserialize teamMembers and userId from JSON strings to arrays
        result[0].teamMembers = JSON.parse(result[0].teamMembers);
        result[0].userId = JSON.parse(result[0].userId);
        resolve(result[0]);
      }
    });
  });
}
