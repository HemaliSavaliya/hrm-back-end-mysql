const connection = require("../config/config");
const multer = require("multer");
const ftp = require("basic-ftp");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "upload/company_logo");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Function to upload file to FTP server
async function uploadLogoToFTP(localFilePath, remoteFilePath) {
  const client = new ftp.Client();

  try {
    await client.access({
      host: process.env.FTP_HOST_NAME,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
    });

    await client.uploadFrom(localFilePath, remoteFilePath);
  } catch (error) {
    console.error(`Error uploading ${localFilePath}:`, error);
    throw error;
  } finally {
    client.close();
  }
}

// Function to download file to FTP server
async function downloadFileFromFTP(res, filename) {
  // Create a client to connect to the FTP server
  const client = new ftp.Client();

  // Retrieve the remote file path
  const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/company_logo/${filename}`;

  try {
    // Connect to the FTP server using credentials
    await client.access({
      host: process.env.FTP_HOST_NAME,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
    });

    // Download the file to the temporary local file path
    await client.downloadTo(res, remoteFilePath);
  } catch (ftpError) {
    console.error(`Error fetching company logo from FTP: ${ftpError}`);
    return res
      .status(500)
      .json({ error: "Error fetching company logo from FTP" });
  } finally {
    // Ensure the FTP client is closed
    client.close();
  }
}

module.exports.addCompany = async (req, res) => {
  try {
    // Check if the user making the request is an superAdmin
    if (req.user && req.user.role === "SuperAdmin") {
      // Multer middleware to precess the file upload
      upload.single("companyLogo[]")(req, res, async function (err) {
        if (err) {
          console.error("Error uploading company logo", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        const {
          companyName,
          companyEmail,
          companyPan,
          companyGST,
          subscription,
          startDate,
          endDate,
        } = req.body;

        // Convert empty strings to null
        const panValue =
          companyPan && companyPan.trim() !== "" ? companyPan : null;
        const gstValue =
          companyGST && companyGST.trim() !== "" ? companyGST : null;

        // Ensure that a file was uploaded
        if (!req.file) {
          return res.status(400).json({ error: "Company logo is required" });
        }

        // Insert the new company into the company table
        const insertSql = `INSERT INTO hrm_companys (companyName, companyEmail, companyPan, companyGST, subscription, startDate, endDate, companyLogo, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        connection.query(
          insertSql,
          [
            companyName,
            companyEmail,
            panValue,
            gstValue,
            subscription,
            startDate || null,
            endDate || null,
            req.file.filename,
            false,
          ],
          async (err, result) => {
            if (err) {
              console.error("Error Adding Company:", err);
              return res.status(500).json({ error: "Internal Server Error" });
            }

            const localFilePath = `./upload/company_logo/${req.file.filename}`;
            const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/company_logo/${req.file.filename}`;

            try {
              await uploadLogoToFTP(localFilePath, remoteFilePath);
              res.status(200).json({
                success: true,
                message: "Company Added Successfully",
              });
            } catch (uploadError) {
              console.error("Error uploading logo to FTP:", uploadError);
              return res
                .status(500)
                .json({ error: "Error uploading logo to FTP" });
            }
          }
        );
      });
    } else {
      // User is not an superAdmin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error creating company", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.updateCompany = async (req, res) => {
  try {
    // Check if the user making the request is an superAdmin
    if (req.user && req.user.role === "SuperAdmin") {
      upload.single("companyLogo[]")(req, res, async function (err) {
        if (err) {
          console.error("Error uploading company logo: " + err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        const {
          companyName,
          companyEmail,
          companyPan,
          companyGST,
          subscription,
          startDate,
          endDate,
        } = req.body;

        const companyId = req.params.id;

        // Update the company in the database
        let updateCompanyQuery, queryParams;

        if (req.file) {
          // If a new logo is uploaded, update the logo along with other details
          updateCompanyQuery =
            "UPDATE hrm_companys SET companyName = ?, companyEmail = ?, companyPan = ?, companyGST = ?, subscription = ?, startDate = ?, endDate = ?, companyLogo = ? WHERE id = ?";

          queryParams = [
            companyName,
            companyEmail,
            companyPan || null,
            companyGST || null,
            subscription,
            startDate,
            endDate,
            req.file.filename,
            companyId,
          ];
        } else {
          // If no new logo is uploaded, update other details while keeping the existing logo
          updateCompanyQuery =
            "UPDATE hrm_companys SET companyName = ?, companyEmail = ?, companyPan = ?, companyGST = ?, subscription = ?, startDate = ?, endDate = ? WHERE id = ?";

          queryParams = [
            companyName,
            companyEmail,
            companyPan || null,
            companyGST || null,
            subscription,
            startDate,
            endDate,
            companyId,
          ];
        }

        connection.query(
          updateCompanyQuery,
          queryParams,
          async (err, result) => {
            if (err) {
              console.error("Error updating company:", err);
              return res.status(500).json({ error: "Internal Server Error" });
            }

            if (req.file) {
              const localFilePath = `./upload/company_logo/${req.file.filename}`;
              const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/company_logo/${req.file.filename}`;

              await uploadLogoToFTP(localFilePath, remoteFilePath);
            }

            res
              .status(200)
              .json({ success: true, message: "Company updated successfully" });
          }
        );
      });
    } else {
      // User is not an superAdmin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error Updating Company", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.deleteCompany = async (req, res) => {
  try {
    // Check if the user making the request is an superAdmin
    if (req.user && req.user.role === "SuperAdmin") {
      const companyId = req.params.id;

      // Begin transaction
      connection.beginTransaction((err) => {
        if (err) {
          console.error("Error starting transaction:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        const checkCompanyQuery =
          "SELECT deleted FROM hrm_companys WHERE id = ?";

        connection.query(checkCompanyQuery, [companyId], (err, result) => {
          if (err) {
            console.error("Error Checking Company", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          if (result.length === 0) {
            return res.status(404).json({ error: "Company not found" });
          }

          const isDeleted = result[0].deleted;

          // Mark the company as deleted
          const deleteCompanyQuery = isDeleted
            ? "UPDATE hrm_companys SET deleted = false WHERE id = ?"
            : "UPDATE hrm_companys SET deleted = true WHERE id = ?";

          connection.query(deleteCompanyQuery, [companyId], (err, result) => {
            if (err) {
              connection.rollback(() => {
                console.error("Error deleting company:", err);
                return res.status(500).json({ error: "Internal Server Error" });
              });
            }

            // Array of related tables
            const relatedTables = [
              { tableName: "hrm_admins", foreignKey: "companyId" },
              { tableName: "hrm_announcements", foreignKey: "companyId" },
              { tableName: "hrm_awards", foreignKey: "companyId" },
              { tableName: "hrm_calendarevents", foreignKey: "companyId" },
              { tableName: "hrm_calendartodo", foreignKey: "companyId" },
              { tableName: "hrm_departments", foreignKey: "companyId" },
              { tableName: "hrm_designations", foreignKey: "companyId" },
              { tableName: "hrm_employees", foreignKey: "companyId" },
              { tableName: "hrm_jobs_requirement", foreignKey: "companyId" },
              { tableName: "hrm_leaverequests", foreignKey: "companyId" },
              { tableName: "hrm_leavetypes", foreignKey: "companyId" },
              { tableName: "hrm_projects", foreignKey: "companyId" },
              { tableName: "hrm_timer_tracker", foreignKey: "companyId" },
              { tableName: "hrm_roles", foreignKey: "companyId" },
            ];

            // Update related entries in each related table
            relatedTables.forEach((table) => {
              let updateQuery;
              if (table.tableName === "role") {
                updateQuery = isDeleted
                  ? `UPDATE ${table.tableName} SET status = 'Enable' WHERE ${table.foreignKey} = ?`
                  : `UPDATE ${table.tableName} SET status = 'Disable' WHERE ${table.foreignKey} = ?`;
              } else {
                updateQuery = isDeleted
                  ? `UPDATE ${table.tableName} SET deleted = false WHERE ${table.foreignKey} = ?`
                  : `UPDATE ${table.tableName} SET deleted = true WHERE ${table.foreignKey} = ?`;
              }

              connection.query(updateQuery, [companyId], (err, result) => {
                if (err) {
                  connection.rollback(() => {
                    console.error(`Error updating ${table.tableName}`, err);
                    return res
                      .status(500)
                      .json({ error: "Internal Server Error" });
                  });
                }
              });
            });

            // Commit transaction if all queries succeed
            connection.commit((err) => {
              if (err) {
                connection.rollback(() => {
                  console.error("Error committing transaction", err);
                  return res
                    .status(500)
                    .json({ error: "Internal Server Error" });
                });
              }

              const message = isDeleted
                ? "Company marked as undeleted"
                : "Company marked as deleted";

              res.status(200).json({ message });
            });
          });
        });
      });
    } else {
      // User is not an superAdmin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error Delete Company", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.companyList = async (req, res) => {
  try {
    const sql = "SELECT * FROM hrm_companys";

    connection.query(sql, (err, result) => {
      if (err) {
        console.error("Error Fetching Company", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (result.length > 0) {
        res.status(200).json(result);
      } else {
        return res.status(404).json({ error: "No Company Found!" });
      }
    });
  } catch (error) {
    console.error("Error Fetching Company List", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.getCompanyLogo = async (req, res) => {
  try {
    // Get the company ID from the request parameters
    const companyId = req.params.companyId;

    const sql = `SELECT companyLogo FROM hrm_companys WHERE id = ?`;

    connection.query(sql, [companyId], async (err, result) => {
      if (err) {
        console.error("Error fetching company logo", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // Get the filename of the company logo from the database result
      const companyLogo = result[0]?.companyLogo;

      if (!companyLogo) {
        return res.status(404).json({ error: "Company logo not found" });
      }

      await downloadFileFromFTP(res, companyLogo);
    });
  } catch (error) {
    console.error(`Error fetching Company Logo: ${error}`);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
