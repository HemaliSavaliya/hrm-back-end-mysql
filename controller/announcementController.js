const connection = require("../config/config");
const multer = require("multer");
const ftp = require("basic-ftp");
const mime = require("mime-types");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "upload/announce_doc");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage }).array("document[]", 5);

// Function to upload file to FTP server
async function uploadAnnounceFileToFTP(files) {
  const client = new ftp.Client();

  try {
    await client.access({
      host: process.env.FTP_HOST_NAME,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
    });

    for (const file of files) {
      const localFilePath = `./upload/announce_doc/${file.filename}`;
      const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/announcement_document/${file.filename}`;

      await client.uploadFrom(localFilePath, remoteFilePath);

      // console.log(`${localFilePath} uploaded successfully`);
    }
  } catch (error) {
    console.error("Error uploading announcement files to FTP", error);
    throw error;
  } finally {
    client.close();
  }
}

// Function to download file from FTP server
async function downloadFileFromFTP(res, filename) {
  const client = new ftp.Client();
  const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/announcement_document/${filename}`;

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

    // console.log(`File downloaded successfully from ${remoteFilePath}`);
  } catch (error) {
    console.error(`Error downloading file:`, error);
    throw error;
  } finally {
    client.close();
  }
}

// Function to delete files from FTP server
// async function deleteFilesFromFTP(filenames) {
//     const client = new ftp.Client();

//     try {
//         await client.access({
//             host: process.env.FTP_HOST_NAME,
//             user: process.env.FTP_USER,
//             password: process.env.FTP_PASSWORD
//         });

//         for (const filename of filenames) {
//             const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/announcement_document/${filename}`;

//             await client.remove(remoteFilePath);

//             // console.log(`${remoteFilePath} Removed successfully`);
//         }
//     } catch (error) {
//         console.error("Error deleting files from FTP server:", error);
//         throw error;
//     } finally {
//         client.close();
//     }
// }

// Function to delete files from local file system
// function deleteFilesLocally(filenames) {
//     for (const filename of filenames) {
//         const localFilePath = `./upload/announce_doc/${filename}`;
//         fs.unlink(localFilePath, (err) => {
//             if (err) {
//                 console.error(`Error deleting file locally: ${localFilePath}`, err);
//             }
//         });
//     }
// }

module.exports.addAnnouncement = async (req, res) => {
  try {
    // Check if the user making the request is an admin
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      // Multer middleware to process the file upload
      upload(req, res, async function (err) {
        if (err) {
          console.error("Error uploading announcement file", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        const { announcementTitle, announcementDetails, selectDepartment } =
          req.body;

        // Insert new announcement into the database
        const addAnnouncement =
          "INSERT INTO hrm_announcements (companyId, announcementTitle, announcementDetails, selectDepartment, document, deleted) VALUES (?, ?, ?, ?, ?, ?)";

        connection.query(
          addAnnouncement,
          [
            req.user.companyId,
            announcementTitle,
            announcementDetails,
            selectDepartment,
            JSON.stringify(req.files.map((file) => file.filename)),
            false,
          ],
          async (err, result) => {
            if (err) {
              console.error("Error adding Announcement:", err);
              return res.status(500).json({ error: "Internal Server Error" });
            }

            try {
              await uploadAnnounceFileToFTP(req.files);

              res.status(200).json({
                success: true,
                message: "Announcement added successfully",
              });
            } catch (error) {
              console.error("Error uploading announcement file to FTP:", error);
              return res.status(500).json({ error: "Internal server Error" });
            }
          }
        );
      });
    } else {
      // User is not an admin, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error Creating announcement", error);
    return res.status(403).json({ error: "Internal Server Error" });
  }
};

module.exports.getDocument = async (req, res) => {
  try {
    // Check if the user making the request is an admin or HR
    if (
      req.user &&
      (req.user.role === "Admin" ||
        req.user.role === "HR" ||
        req.user.role === "Employee")
    ) {
      const documentName = req.params.documentName;

      await downloadFileFromFTP(res, documentName);
    } else {
      // User is not an admin or HR, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error retrieving Document:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.updateAnnouncement = async (req, res) => {
  try {
    // Check if the user making the request is an admin
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      upload(req, res, async function (err) {
        if (err) {
          console.error("Error uploading announcement file", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        const { announcementTitle, announcementDetails, selectDepartment } =
          req.body;
        const annoId = req.params.id;

        // Fetch the existing announcement document list from the database
        connection.query(
          "SELECT * FROM hrm_announcements WHERE id = ?",
          [annoId],
          async (err, results) => {
            if (err) {
              console.error("Error fetching existing document list", err);
              return res.status(500).json({ error: "Internal Server Error" });
            }

            // Parse existing documents if any
            let existingDocuments = [];
            if (results && results[0] && results[0].document) {
              existingDocuments = JSON.parse(results[0].document);
            }

            // Combine existing documents with new documents from the request
            if (req.files && req.files.length > 0) {
              const newDocumentFilenames = req.files.map(
                (file) => file.filename
              );
              existingDocuments =
                existingDocuments.concat(newDocumentFilenames);

              // Upload new files to the FTP server
              try {
                await uploadAnnounceFileToFTP(req.files);
              } catch (error) {
                console.error(
                  "Error uploading announcement files to FTP server: " + error
                );
                return res.status(500).json({ error: "Internal Server Error" });
              }
            }

            // Convert the combined document list to a JSON string for storage
            const updatedDocumentList = JSON.stringify(existingDocuments);

            // Update the announcement in the database
            const updateAnnouncementQuery =
              "UPDATE hrm_announcements SET announcementTitle = ?, announcementDetails = ?, selectDepartment = ?, document = ? WHERE id = ?";

            connection.query(
              updateAnnouncementQuery,
              [
                announcementTitle,
                announcementDetails,
                selectDepartment,
                updatedDocumentList,
                annoId,
              ],
              (err, result) => {
                if (err) {
                  console.error("Error updating announcement", err);
                  return res
                    .status(500)
                    .json({ error: "Internal Server Error" });
                }
                res.status(200).json({
                  success: true,
                  message: "Announcement updated successfully",
                });
              }
            );
          }
        );
      });
    } else {
      // User is not an admin, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error updating announcement", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcementId = req.params.id;

    // Check if the user making the request is an admin
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      // Update announcement status to "Deleted" in the database
      const deleteAnnouncementQuery =
        "UPDATE hrm_announcements SET deleted = true WHERE id = ?";

      connection.query(
        deleteAnnouncementQuery,
        [announcementId],
        async (err, result) => {
          if (err) {
            console.error("Error deleting announcement", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res
            .status(200)
            .json({ message: "Announcement marked as deleted successfully" });
        }
      );
    } else {
      // User is not an admin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error deleting announcement", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.deleteDocument = async (req, res) => {
  try {
    const announcementId = req.params.id;
    const documentListToDelete = req.body.document; // This should be an array of document filenames to be deleted

    // Check if the user making the request is an admin
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      // Fetch the existing announcement document list from the database
      connection.query(
        "SELECT document FROM hrm_announcements WHERE id = ?",
        [announcementId],
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
                "UPDATE hrm_announcements SET document = ? WHERE id = ?";
              connection.query(
                updateAnnouncementQuery,
                [JSON.stringify(updatedDocuments), announcementId],
                (err, result) => {
                  if (err) {
                    console.error("Error updating announcement:", err);
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
            res.status(404).json({ error: "No documents found" });
          }
        }
      );
    }
  } catch (error) {
    console.error("Error deleting specified document", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.announcementList = async (req, res) => {
  try {
    const sql =
      "SELECT * FROM hrm_announcements WHERE deleted = false AND companyId = ?";

    connection.query(sql, [req.user.companyId], (err, results) => {
      if (err) {
        console.error("Error Fetching Announcement", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (results.length > 0) {
        // Convert the document field to an array
        results.forEach((result) => {
          result.document = JSON.parse(result.document);
        });

        res.status(200).json(results);
      } else {
        return res.status(404).json({ error: "No Announcement Found!" });
      }
    });
  } catch (error) {
    console.error("Error Fetching Announcement", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
