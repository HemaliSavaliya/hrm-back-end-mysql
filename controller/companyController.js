const pool = require("../config/config");
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

// Add company function
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

        pool.query(
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

        pool.query(updateCompanyQuery, queryParams, async (err, result) => {
          if (err) {
            console.error("Error updating company:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          if (req.file) {
            const localFilePath = `./upload/company_logo/${req.file.filename}`;
            const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/company_logo/${req.file.filename}`;
            try {
              await uploadLogoToFTP(localFilePath, remoteFilePath);
            } catch (ftpError) {
              console.error("Error uploading logo to FTP:", ftpError);
              return res
                .status(500)
                .json({ error: "Error uploading logo to FTP" });
            }
          }

          res
            .status(200)
            .json({ success: true, message: "Company updated successfully" });
        });
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
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err.stack);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    try {
      // Check if the user making the request is a SuperAdmin
      if (req.user && req.user.role === "SuperAdmin") {
        const companyId = req.params.id;

        // Begin transaction
        connection.beginTransaction((err) => {
          if (err) {
            console.error("Error starting transaction:", err);
            connection.release(); // Release connection back to the pool
            return res.status(500).json({ error: "Internal Server Error" });
          }

          const checkCompanyQuery =
            "SELECT deleted FROM hrm_companys WHERE id = ?";

          connection.query(checkCompanyQuery, [companyId], (err, result) => {
            if (err) {
              console.error("Error checking company:", err);
              connection.rollback(() => connection.release()); // Rollback and release connection
              return res.status(500).json({ error: "Internal Server Error" });
            }

            if (result.length === 0) {
              connection.rollback(() => connection.release()); // Rollback and release connection
              return res.status(404).json({ error: "Company not found" });
            }

            const isDeleted = result[0].deleted;

            const deleteCompanyQuery = isDeleted
              ? "UPDATE hrm_companys SET deleted = false WHERE id = ?"
              : "UPDATE hrm_companys SET deleted = true WHERE id = ?";

            connection.query(deleteCompanyQuery, [companyId], (err, result) => {
              if (err) {
                connection.rollback(() => {
                  connection.release(); // Rollback and release connection
                  console.error("Error updating company:", err);
                  return res
                    .status(500)
                    .json({ error: "Internal Server Error" });
                });
                return; // Exit early to avoid further processing
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
                { tableName: "hrm_holidays", foreignKey: "companyId" },
              ];

              // Track errors in the forEach loop
              let queryError = false;

              // Update related entries in each related table
              relatedTables.forEach((table, index) => {
                let updateQuery;
                if (table.tableName === "hrm_roles") {
                  updateQuery = isDeleted
                    ? `UPDATE ${table.tableName} SET status = 'Enable' WHERE ${table.foreignKey} = ?`
                    : `UPDATE ${table.tableName} SET status = 'Disable' WHERE ${table.foreignKey} = ?`;
                } else {
                  updateQuery = isDeleted
                    ? `UPDATE ${table.tableName} SET deleted = false WHERE ${table.foreignKey} = ?`
                    : `UPDATE ${table.tableName} SET deleted = true WHERE ${table.foreignKey} = ?`;
                }

                connection.query(updateQuery, [companyId], (err) => {
                  if (err) {
                    queryError = true;
                    console.error(`Error updating ${table.tableName}:`, err);
                    connection.rollback(() => connection.release()); // Rollback and release connection
                    if (index === relatedTables.length - 1) {
                      return res
                        .status(500)
                        .json({ error: "Internal Server Error" });
                    }
                  }

                  // Commit the transaction after processing the last table
                  if (index === relatedTables.length - 1 && !queryError) {
                    connection.commit((err) => {
                      if (err) {
                        console.error("Error committing transaction:", err);
                        connection.rollback(() => connection.release()); // Rollback and release connection
                        return res
                          .status(500)
                          .json({ error: "Internal Server Error" });
                      }

                      const message = isDeleted
                        ? "Company marked as undeleted"
                        : "Company marked as deleted";

                      connection.release(); // Release connection
                      res.status(200).json({ message });
                    });
                  }
                });
              });
            });
          });
        });
      } else {
        // User is not a SuperAdmin, deny access
        connection.release(); // Release connection
        res.status(403).json({ error: "Access denied" });
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      connection.release(); // Release connection
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
};

module.exports.companyAllList = async (req, res) => {
  try {
    const sql = "SELECT * FROM hrm_companys";

    pool.query(sql, (err, result) => {
      if (err) {
        console.error("Error fetching company", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (result.length > 0) {
        res.status(200).json(result);
      } else {
        return res.status(404).json({ error: "No Company Found!" });
      }
    });
  } catch (error) {
    console.error("Error Fetching company list:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.companyListActive = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "companyName";
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

    const offset = (page - 1) * limit;

    // whitelist columns that can be sorted
    const validSortColumns = [
      "companyName",
      "companyEmail",
      "companyPan",
      "companyGST",
      "subscription",
      "startDate",
      "endDate",
    ];

    if (!validSortColumns.includes(sortBy)) {
      return res.status(400).json({ error: "Invalid sort column" });
    }

    // count total active items with filtering
    const countQuery = `SELECT COUNT(*) AS count FROM hrm_companys WHERE companyName LIKE ? AND deleted = false`;

    pool.query(countQuery, [`%${search}%`], (err, countResult) => {
      if (err) {
        console.error("Error counting active company:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const totalItems = countResult[0].count || 0;
      const totalPages = Math.ceil(totalItems / limit);

      // Fetch active companies with sorting and filtering, and renewal date logic
      const dataQuery = `SELECT 
          c.id, 
          c.companyName, 
          c.companyEmail, 
          c.companyPan, 
          c.companyGST, 
          c.subscription, 
          COALESCE(
            (SELECT cs.startDate 
            FROM hrm_company_subscriptions cs 
            WHERE cs.companyId = c.id 
            ORDER BY cs.endDate DESC 
            LIMIT 1), 
            c.startDate
          ) AS startDate, 
          COALESCE(
            (SELECT cs.endDate 
            FROM hrm_company_subscriptions cs 
            WHERE cs.companyId = c.id 
            ORDER BY cs.endDate DESC 
            LIMIT 1), 
            c.endDate
          ) AS endDate 
        FROM 
          hrm_companys c
        WHERE 
          c.deleted = false 
          AND c.companyName LIKE ? 
        ORDER BY 
          ${sortBy} ${sortOrder} 
        LIMIT ? OFFSET ?`;

      // const dataQuery = `SELECT * FROM hrm_companys WHERE deleted=false AND companyName LIKE ? ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;

      pool.query(
        dataQuery,
        [`%${search}%`, limit, offset],
        (err, dataResult) => {
          if (err) {
            console.error("Error fetching active company:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res.status(200).json({
            data: dataResult,
            totalItems,
            totalPages,
            currentPage: page,
            isNext: page < totalPages,
          });
        }
      );
    });
  } catch (error) {
    console.error("Error fetching active Company list:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.companyListInactive = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "companyName";
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

    const offset = (page - 1) * limit;

    // whitelist columns that can be sorted
    const validSortColumns = [
      "companyName",
      "companyEmail",
      "companyPan",
      "companyGST",
      "subscription",
      "startDate",
      "endDate",
    ];

    if (!validSortColumns.includes(sortBy)) {
      return res.status(400).json({ error: "Invalid sort column" });
    }

    // count total inactive items with filtering
    const countQuery = `SELECT COUNT(*) AS count FROM hrm_companys WHERE companyName LIKE ? AND deleted = true`;

    pool.query(countQuery, [`%${search}%`], (err, countResult) => {
      if (err) {
        console.error("Error counting inactive company:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const totalItems = countResult[0].count || 0;
      const totalPages = Math.ceil(totalItems / limit);

      // Fetch inactive companies with sorting and filtering, and renewal date logic
      const dataQuery = `
          SELECT 
            c.id, 
            c.companyName, 
            c.companyEmail, 
            c.companyPan, 
            c.companyGST, 
            c.subscription, 
            COALESCE(
              (SELECT cs.startDate 
              FROM hrm_company_subscriptions cs 
              WHERE cs.companyId = c.id 
              ORDER BY cs.endDate DESC 
              LIMIT 1), 
              c.startDate
            ) AS startDate,  
            COALESCE(
              (SELECT cs.endDate 
              FROM hrm_company_subscriptions cs 
              WHERE cs.companyId = c.id 
              ORDER BY cs.endDate DESC 
              LIMIT 1), 
              c.endDate
            ) AS endDate 
          FROM 
            hrm_companys c
          WHERE 
            c.deleted = true 
            AND c.companyName LIKE ? 
          ORDER BY 
            ${sortBy} ${sortOrder} 
          LIMIT ? OFFSET ?`;

      // const dataQuery = `SELECT * FROM hrm_companys WHERE deleted = true AND companyName LIKE ? ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;

      pool.query(
        dataQuery,
        [`%${search}%`, limit, offset],
        (err, dataResult) => {
          if (err) {
            console.error("Error fetching inactive company:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res.status(200).json({
            data: dataResult,
            totalItems,
            totalPages,
            currentPage: page,
            isNext: page < totalPages,
          });
        }
      );
    });
  } catch (error) {
    console.error("Error fetching inactive Company list:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.getCompanyLogo = async (req, res) => {
  try {
    // Get the company ID from the request parameters
    const companyId = req.params.companyId;

    const sql = `SELECT companyLogo FROM hrm_companys WHERE id = ?`;

    pool.query(sql, [companyId], async (err, result) => {
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

module.exports.renewSubscription = async (req, res) => {
  try {
    // Check if the user making the request is an superAdmin
    if (req.user && req.user.role === "SuperAdmin") {
      const companyId = req.params.id;
      const { startDate, endDate } = req.body;

      // First, fetch the companyName based on companyId
      const getCompanyNameQuery = `SELECT companyName FROM hrm_companys WHERE id = ?`;

      pool.query(getCompanyNameQuery, [companyId], (err, companyResult) => {
        if (err) {
          console.error("Error fetching company name:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        if (companyResult.length === 0) {
          return res.status(404).json({ error: "Company not found" });
        }

        const companyName = companyResult[0].companyName;

        // Now insert or update the subscription in the subscription table
        const query = `INSERT INTO hrm_company_subscriptions (companyId, companyName, startDate, endDate) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE startDate = VALUES(startDate), endDate = VALUES(endDate)`;

        pool.query(
          query,
          [companyId, companyName, startDate, endDate],
          (err, result) => {
            if (err) {
              console.error("Error Renewing subscription:", err);
              return res
                .status(500)
                .json({ error: "Error Renewing subscription" });
            }

            res
              .status(200)
              .json({ message: "Subscription renewed successfully" });
          }
        );
      });
    } else {
      // User is not an superAdmin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error Creating Subscription:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
