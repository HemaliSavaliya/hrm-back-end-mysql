const connection = require("../config/config");
const bcrypt = require("bcrypt");
const multer = require("multer");
const ftp = require("basic-ftp");
const mime = require("mime-types");

// Define storage options for government documents
const storageDocument = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "upload/employee_doc"); // Define the destination folder
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const uploadDocument = multer({ storage: storageDocument }).array(
  "governmentDocument[]",
  5
);

// Function to upload file to FTP server
async function uploadFileToFtp(files) {
  const client = new ftp.Client();

  try {
    await client.access({
      host: process.env.FTP_HOST_NAME,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
    });

    for (const file of files) {
      const localFilePath = `./upload/employee_doc/${file.filename}`;
      const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/employee_document/${file.filename}`;

      await client.uploadFrom(localFilePath, remoteFilePath);

      // console.log(`${localFilePath} uploaded successfully`);
    }
  } catch (error) {
    console.error(`Error uploading ${localFilePath}:`, error);
    throw error;
  } finally {
    client.close();
  }
}

// Function to download file from FTP server
async function downloadFileFromFTP(res, filename) {
  const client = new ftp.Client();
  const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/employee_document/${filename}`;

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
    console.error(`Error downloading file ${remoteFilePath}:`, error);
    throw error;
  } finally {
    client.close();
  }
}

module.exports.addEmp = async (req, res) => {
  try {
    // Check if the user making the request is an admin or HR
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      // Multer middleware to process the file upload
      uploadDocument(req, res, async function (err) {
        if (err) {
          console.error("Error uploading file:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Check if the provided departmentId exists in the departments table
        const departmentId = req.body.department;
        const checkDepartmentQuery =
          "SELECT * FROM hrm_departments WHERE id = ?";

        connection.query(
          checkDepartmentQuery,
          [departmentId],
          async (checkDepartmentErr, departmentResult) => {
            if (checkDepartmentErr) {
              console.error("Error checking department:", checkDepartmentErr);
              return res.status(500).json({ error: "Internal Server Error" });
            }

            if (departmentResult.length === 0) {
              return res.status(404).json({ error: "Department not found" });
            }

            // // Find the latest user to get the current userId
            // const latestUserQuery = `SELECT userId FROM employee ORDER BY userId DESC LIMIT 1`;

            // connection.query(latestUserQuery, async (latestUserErr, latestUserResult) => {
            //   if (latestUserErr) {
            //     console.error("Error finding latest user:", latestUserErr);
            //     return res.status(500).json({ error: "Internal Server Error" });
            //   }

            //   // Increment userId for the new user
            //   const nextUserId = latestUserResult.length > 0 ? latestUserResult[0].userId + 1 : 1;

            // Get the name of the logged-in user (addedBy)
            const addedBy = req.user.name;

            // Convert birthDate to the desired format
            const birthDate = new Date(req.body.birthDate);
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
            const monthAbbreviation = monthNames[birthDate.getMonth()];
            const birthDateFormatted = `${birthDate.getDate()} ${monthAbbreviation} ${birthDate.getFullYear()}`;

            // Convert joiningDate to the desired format
            const joiningDate = new Date(req.body.joiningDate);
            const joiningDateFormatted = `${joiningDate.getDate()} ${monthAbbreviation} ${joiningDate.getFullYear()}`;

            // Insert employee data into the database
            const sql = `
              INSERT INTO hrm_employees (addedBy, companyId, name, email, password, department, designation, mobileNo, alternateNumber, address, birthDate, joiningDate, bloodGroup, gender, role, status, salary, bankAccountHolderName, bankAccountNumber, bankName, bankIFSCCode, bankBranchLocation, governmentDocument, deleted)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
              addedBy,
              // nextUserId,
              req.user.companyId,
              req.body.name,
              req.body.email,
              hashedPassword, // Store hashed password
              departmentId,
              req.body.designation,
              req.body.mobileNo,
              req.body.alternateNumber || null,
              req.body.address || null,
              birthDateFormatted,
              joiningDateFormatted,
              req.body.bloodGroup || null,
              req.body.gender,
              req.body.role,
              req.body.status,
              req.body.salary,
              req.body.bankAccountHolderName,
              req.body.bankAccountNumber,
              req.body.bankName,
              req.body.bankIFSCCode,
              req.body.bankBranchLocation,
              JSON.stringify(req.files.map((file) => file.filename)), // Store filenames as JSON array in the database
              false,
            ];

            connection.query(sql, params, async (err, result) => {
              if (err) {
                console.error("Error creating employee:", err);
                return res.status(500).json({ error: "Internal Server Error" });
              }

              try {
                await uploadFileToFtp(req.files);

                // Update department table with new team members
                const updateDepartmentQuery =
                  "UPDATE hrm_departments SET teamMembers = JSON_ARRAY_APPEND(COALESCE(teamMembers, '[]'), '$', ?) WHERE id = ?";

                connection.query(
                  updateDepartmentQuery,
                  [result.insertId, departmentId],
                  (updateErr, updateResult) => {
                    if (updateErr) {
                      console.error("Error updating department", updateErr);
                      return res
                        .status(500)
                        .json({ error: "Internal Server Error" });
                    }

                    // Team member successfully added to department
                    res.status(200).json({
                      message: "Employee added successfully",
                      employeeId: result.insertId,
                    });
                  }
                );
              } catch (error) {
                console.error("Error uploading file to FTP:", error);
                return res.status(500).json({ error: "Internal Server Error" });
              }
            });
            // });
          }
        );
      });
    } else {
      // User is not an admin or HR, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error Creating Employee", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.getEmpDocument = async (req, res) => {
  try {
    // Check if the user making the request is an admin or HR
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      const documentName = req.params.documentName;

      await downloadFileFromFTP(res, documentName);
    } else {
      // User is not an admin or HR, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error retrieving employee image:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.updateEmp = async (req, res) => {
  try {
    const userId = req.params.id; // Employee's user ID

    // Check if the user has admin or HR role
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      // Use Multer middleware to process the file upload
      uploadDocument(req, res, async (err) => {
        if (err) {
          console.error("Error uploading document:", err);
          return res.status(500).json({ error: "Error uploading document" });
        }

        const {
          department,
          email,
          designation,
          address,
          mobileNo,
          alternateNumber,
          role,
          status,
          salary,
          bankAccountHolderName,
          bankAccountNumber,
          bankName,
          bankIFSCCode,
          bankBranchLocation,
        } = req.body;

        // Query to get the employee's current department
        const getCurrentDeptQuery =
          "SELECT department FROM hrm_employees WHERE id = ?";

        connection.query(
          getCurrentDeptQuery,
          [userId],
          (currentDeptErr, currentDeptResult) => {
            if (currentDeptErr) {
              console.error(
                "Error fetching current department:",
                currentDeptErr
              );
              return res.status(500).json({ error: "Internal Server Error" });
            }

            if (currentDeptResult.length === 0) {
              return res.status(404).json({ error: "Employee not found" });
            }

            // Get the current department ID
            const currentDepartmentId = currentDeptResult[0].department;

            // Check if the new department ID exists
            const checkDeptQuery = "SELECT * FROM hrm_departments WHERE id = ?";

            connection.query(
              checkDeptQuery,
              [department],
              (checkDeptErr, deptResult) => {
                if (checkDeptErr) {
                  console.error("Error checking department:", checkDeptErr);
                  return res
                    .status(500)
                    .json({ error: "Internal Server Error" });
                }

                if (deptResult.length === 0) {
                  return res
                    .status(404)
                    .json({ error: "Department not found" });
                }

                // First, remove the userId from the current department's teamMembers array
                const removeUserQuery = `
              UPDATE hrm_departments
              SET teamMembers = JSON_REMOVE(
                teamMembers,
                JSON_UNQUOTE(JSON_SEARCH(teamMembers, 'one', ?))
              )
              WHERE id = ?
            `;

                connection.query(
                  removeUserQuery,
                  [userId, currentDepartmentId],
                  (removeErr, removeResult) => {
                    if (removeErr) {
                      console.error(
                        "Error removing user from current department:",
                        removeErr
                      );
                      return res
                        .status(500)
                        .json({ error: "Internal Server Error" });
                    }

                    // Next, add the userId to the new department's teamMembers array
                    const addUserQuery = `
                UPDATE hrm_departments
                SET teamMembers = JSON_ARRAY_APPEND(
                  teamMembers,
                  '$',
                  ?
                )
                WHERE id = ?;
              `;

                    connection.query(
                      addUserQuery,
                      [parseInt(userId), department],
                      (addErr, addResult) => {
                        if (addErr) {
                          console.error(
                            "Error adding user to new department:",
                            addErr
                          );
                          return res
                            .status(500)
                            .json({ error: "Internal Server Error" });
                        }

                        // Fetch the existing employee document list from the database
                        const getDocumentListQuery =
                          "SELECT governmentDocument FROM hrm_employees WHERE id = ?";
                        connection.query(
                          getDocumentListQuery,
                          [userId],
                          async (err, results) => {
                            if (err) {
                              console.error(
                                "Error fetching existing document list",
                                err
                              );
                              return res
                                .status(500)
                                .json({ error: "Internal Server Error" });
                            }

                            // Parse existing documents if any
                            let existingDocuments = [];

                            if (
                              results &&
                              results[0] &&
                              results[0].governmentDocument
                            ) {
                              existingDocuments = JSON.parse(
                                results[0].governmentDocument
                              );
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
                                await uploadFileToFtp(req.files);
                              } catch (error) {
                                console.error(
                                  "Error uploading document files to FTP server: " +
                                    error
                                );
                                return res
                                  .status(500)
                                  .json({ error: "Internal Server Error" });
                              }
                            }

                            // Convert the combined document list to a JSON string for storage
                            const updatedDocumentList =
                              JSON.stringify(existingDocuments);

                            // Finally, update the employee's department to the new department ID
                            const updateEmpQuery = `
                    UPDATE hrm_employees
                    SET email = ?, designation = ?, department = ?, address = ?, mobileNo = ?, alternateNumber = ?, role = ?, status = ?, salary = ?, bankAccountHolderName = ?, bankAccountNumber = ?, bankName = ?, bankIFSCCode = ?, bankBranchLocation = ?, governmentDocument = ?
                    WHERE id = ?;
                  `;

                            connection.query(
                              updateEmpQuery,
                              [
                                email,
                                designation,
                                department,
                                address,
                                mobileNo,
                                alternateNumber,
                                role,
                                status,
                                salary,
                                bankAccountHolderName,
                                bankAccountNumber,
                                bankName,
                                bankIFSCCode,
                                bankBranchLocation,
                                updatedDocumentList,
                                userId,
                              ],
                              (updateEmpErr, updateEmpResult) => {
                                if (updateEmpErr) {
                                  console.error(
                                    "Error updating employee's department:",
                                    updateEmpErr
                                  );
                                  return res
                                    .status(500)
                                    .json({ error: "Internal Server Error" });
                                }

                                if (updateEmpResult.affectedRows === 0) {
                                  return res
                                    .status(404)
                                    .json({ error: "Employee not found" });
                                }

                                // Return a success message to the client
                                res.status(200).json({
                                  message: "Employee updated successfully",
                                });
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    } else {
      // User does not have admin or HR role
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error updating employee:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.deleteDocument = async (req, res) => {
  try {
    const empId = req.params.id;
    const documentListToDelete = req.body.document; // This should be an array of document filenames to be deleted

    // Check if the user making the request is an admin
    if (req.user && req.user.role === "Admin") {
      // Fetch the existing employee document list from the database
      connection.query(
        "SELECT governmentDocument FROM hrm_employees WHERE id = ?",
        [empId],
        async (err, results) => {
          if (err) {
            console.error("Error fetching existing document list", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          if (results && results[0] && results[0].governmentDocument) {
            // Parse the document list
            let existingDocuments = JSON.parse(results[0].governmentDocument);

            // Filter out the documents to be deleted
            const updatedDocuments = existingDocuments.filter(
              (document) => !documentListToDelete.includes(document)
            );

            // Delete files from FTP server
            try {
              // Update the announcement in the database
              const updateAnnouncementQuery =
                "UPDATE hrm_employees SET governmentDocument = ? WHERE id = ?";
              connection.query(
                updateAnnouncementQuery,
                [JSON.stringify(updatedDocuments), empId],
                (err, result) => {
                  if (err) {
                    console.error("Error updating employee:", err);
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

module.exports.deleteEmp = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if the user making the request is an admin or HR
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      // Construct SQL query to update the status of the employee
      const updateEmployeeQuery = `UPDATE hrm_employees SET deleted = true WHERE id = ?`;

      connection.query(updateEmployeeQuery, [userId], (err, result) => {
        if (err) {
          console.error("Error deleting employee", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Employee does not exist" });
        }

        // Remove Employee ID from department teamMembers array
        const removeFromDepartmentQuery = `UPDATE hrm_departments SET teamMembers = JSON_REMOVE(teamMembers, JSON_UNQUOTE(JSON_SEARCH(teamMembers, 'one', ?))) WHERE JSON_SEARCH(teamMembers, 'one', ?) IS NOT NULL`;

        connection.query(
          removeFromDepartmentQuery,
          [userId, userId],
          (removeFromDeptErr, removeFromDeptResult) => {
            if (removeFromDeptErr) {
              console.error(
                "Error removing employee from department: ",
                removeFromDeptErr
              );
              return res.status(500).json({ error: "Internal Server Error" });
            }

            res.status(200).json({ message: "Employee marked as deleted" });
          }
        );
      });
    } else {
      // User is not an admin and HR, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error deleting Employee", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.empList = async (req, res) => {
  try {
    let employees = [];
    let admins = [];

    // Fetch employees data
    const employeeQuery =
      "SELECT e.*, d.departmentName AS department FROM hrm_employees e LEFT JOIN hrm_departments d ON e.department = d.id WHERE e.deleted = false AND e.companyId = ?";
    const employeeResults = await query(employeeQuery, [req.user.companyId]);
    employees = employeeResults;

    // Fetch admins data
    if (req.user.role === "SuperAdmin") {
      const adminQuery = "SELECT * FROM hrm_admins";
      const adminResults = await query(adminQuery);
      admins = adminResults;
    }

    // Combine both arrays
    const allUsers = [...employees, ...admins];

    // Convert the document field to an array for employees
    allUsers.forEach((user) => {
      if (user.governmentDocument) {
        user.governmentDocument = JSON.parse(user.governmentDocument);
      }
    });

    res.status(200).json(allUsers);
  } catch (error) {
    console.error("Error Fetching Users", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.empListById = async (req, res) => {
  try {
    // Retrieve the user ID from the authenticated user
    const userId = req.params.id;

    // SQL query to select employee data by userId
    const sql = "SELECT * FROM hrm_employees WHERE id = ?";

    // Execute the query with userID as a parameter
    connection.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Error Fetching employee by ID", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // Check if employee with the provided userId exists
      if (results.length > 0) {
        res.status(200).json(results[0]); // Return the first employee found
      } else {
        return res.status(404).json({ result: "Employee Not Found!" });
      }
    });
  } catch (error) {
    console.error("Error Fetching User List", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Utility function to query the database and return a promise
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
};

module.exports.updatePassword = async (req, res) => {
  try {
    const { email, password, newPassword, confirmPassword } = req.body;

    // Find the employee by ID
    let employees = await query("SELECT * FROM hrm_employees WHERE email = ?", [
      email,
    ]);

    // Find the admin by ID
    let admins = await query("SELECT * FROM hrm_admins WHERE email = ?", [
      email,
    ]);

    // Find the admin by ID
    let superAdmins = await query(
      "SELECT * FROM hrm_superadmin WHERE email = ?",
      [email]
    );

    if (!employees.length && !admins.length && !superAdmins.length) {
      return res.status(404).json({ message: "User not found" });
    }

    let userToUpdate;
    if (employees.length > 0) {
      userToUpdate = employees[0];
    } else if (admins.length > 0) {
      userToUpdate = admins[0];
    } else if (superAdmins.length > 0) {
      userToUpdate = superAdmins[0];
    } else {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if newPassword and confirmPassword match
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "New password and confirm password do not match" });
    }

    // Compare passwords
    if (bcrypt.compareSync(password, userToUpdate.password)) {
      const hashedPassword = bcrypt.hashSync(newPassword, 10);

      // Update password in employees table if the user is an employee
      if (employees.length > 0) {
        await query("UPDATE hrm_employees SET password = ? WHERE id = ?", [
          hashedPassword,
          userToUpdate.id,
        ]);
      }

      // Update password in admins table if the user is an admin
      if (admins.length > 0) {
        await query("UPDATE hrm_admins SET password = ? WHERE id = ?", [
          hashedPassword,
          userToUpdate.id,
        ]);
      }

      // Update password in super admins table if the user is an super admin
      if (superAdmins.length > 0) {
        await query("UPDATE hrm_superadmin SET password = ? WHERE id = ?", [
          hashedPassword,
          userToUpdate.id,
        ]);
      }

      // Fetch the updated user document
      let updatedUser;
      if (employees.length > 0) {
        updatedUser = await query("SELECT * FROM hrm_employees WHERE id = ?", [
          userToUpdate.id,
        ]);
      } else if (admins.length > 0) {
        updatedUser = await query("SELECT * FROM hrm_admins WHERE id = ?", [
          userToUpdate.id,
        ]);
      } else if (superAdmins.length > 0) {
        updatedUser = await query("SELECT * FROM hrm_superadmin WHERE id = ?", [
          userToUpdate.id,
        ]);
      }

      res.status(200).json({
        message: "Password updated successfully",
        user: updatedUser[0],
      });
    } else {
      return res.status(400).json({ message: "Password mismatch" });
    }
  } catch (error) {
    console.error("Error Updating password:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    // Check if the user making the request is an admin or HR
    // if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
    const { id, newPassword, confirmPassword } = req.body;

    // Check if newPassword and confirmPassword match
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "New password and confirm password do not match" });
    }

    let hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Determine which table to update based on the user's role
    let tableName;
    if (req.user.role === "SuperAdmin") {
      tableName = "hrm_admins";
    } else if (req.user.role === "Admin" || req.user.role === "HR") {
      tableName = "hrm_employees";
    } else {
      return res.status(403).json({ error: "Access Denied" });
    }

    // Update password for employee table
    const updateEmpQuery = `UPDATE ${tableName} SET password = ? WHERE id = ?`;

    connection.query(
      updateEmpQuery,
      [hashedPassword, id],
      async (updateEmpErr, updateEmpResult) => {
        if (updateEmpErr) {
          console.error(
            `Error updating employee password in ${tableName}: `,
            updateEmpErr
          );
          return res.status(500).json({ error: "Internal Server Error" });
        }

        // Check if any rows were affected
        if (updateEmpResult.affectedRows === 0) {
          return res.status(404).json({ message: "Employee not found" });
        }

        res.status(200).json({ message: "Password updated successfully" });
      }
    );
    // } else {
    //   // User is not an admin or HR, deny access
    //   res.status(403).json({ error: "Access Denied" });
    // }
  } catch (error) {
    console.error("Error during change password", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
