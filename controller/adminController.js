const pool = require("../config/config");
const bcrypt = require("bcrypt");

module.exports.addAdmin = async (req, res) => {
  try {
    // Check if the user making the request is an superAdmin
    if (req.user && req.user.role === "SuperAdmin") {
      const { companyId, name, email, password, role } = req.body;

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new admin into the admin table
      const insertSql = `INSERT INTO hrm_admins (companyId, name, email, password, role, deleted) VALUES (?, ?, ?, ?, ?, ?)`;

      pool.query(
        insertSql,
        [companyId, name, email, hashedPassword, role || "Admin", false],
        (err, result) => {
          if (err) {
            console.error("Error Adding Admin:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res
            .status(200)
            .json({ success: true, message: "Admin Added Successfully" });
        }
      );
    } else {
      // User is not an superAdmin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error creating admin", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.updateAdmin = async (req, res) => {
  try {
    // Check if the user making the request is an superAdmin
    if (req.user && req.user.role === "SuperAdmin") {
      const { companyId, name, email } = req.body;

      const adminId = req.params.id;

      // Update the admin in database
      const updateAdminQuery =
        "UPDATE hrm_admins SET companyId = ?, name = ?, email = ? WHERE id = ?";

      pool.query(
        updateAdminQuery,
        [companyId, name, email, adminId],
        (err, result) => {
          if (err) {
            console.error("Error updating admin:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res
            .status(200)
            .json({ success: true, message: "Admin updated successfully" });
        }
      );
    } else {
      // User is not an superAdmin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error updating admin", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.deleteAdmin = async (req, res) => {
  try {
    // Check if the user making the request is an superAdmin
    if (req.user && req.user.role === "SuperAdmin") {
      const adminId = req.params.id;

      const checkAdminQuery = "SELECT deleted FROM hrm_admins WHERE id = ?";

      pool.query(checkAdminQuery, [adminId], (err, result) => {
        if (err) {
          console.error("Error Checking Admin", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        if (result.length === 0) {
          return res.status(404).json({ error: "Admin not found" });
        }

        const isDeleted = result[0].deleted;

        // Update the admin status based on its current state
        const toggleAdminQuery = isDeleted
          ? "UPDATE hrm_admins SET deleted = false WHERE id = ?"
          : "UPDATE hrm_admins SET deleted = true WHERE id = ?";

        pool.query(toggleAdminQuery, [adminId], (err, result) => {
          if (err) {
            console.error("Error Toggling Admin Status", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          const message = isDeleted
            ? "Admin marked as undeleted"
            : "Admin marked as deleted";

          res.status(200).json({ success: true, message });
        });
      });
    } else {
      // User is not an superAdmin, deny access
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error("Error deleting admin", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.adminList = async (req, res) => {
  try {
    const sql =
      "SELECT a.*, c.companyName AS companyId FROM hrm_admins a LEFT JOIN hrm_companys c ON a.companyId = c.id";

    pool.query(sql, (err, result) => {
      if (err) {
        console.error("Error Fetching Admin List", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (result.length > 0) {
        res.status(200).json(result);
      } else {
        res.status(404).json({ error: "No Admin Found!" });
      }
    });
  } catch (error) {
    console.error("Error Fetching Admin List", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// module.exports.adminList = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page, 10) || 1;
//     const pageSize = parseInt(req.query.pageSize, 10) || 10;
//     const offset = (page - 1) * pageSize;

//     // Query to get total count of records
//     const countQuery = 'SELECT COUNT(*) as total FROM hrm_admins';
//     const countResult = await new Promise((resolve, reject) => {
//       pool.query(countQuery, (err, result) => {
//         if (err) {
//           console.error('Error Fetching Admin Count', err);
//           reject(err);
//         } else {
//           resolve(result[0].total);
//         }
//       });
//     });

//     // Query to get paginated data
//     const sql = `
//       SELECT a.*, c.companyName AS companyName
//       FROM hrm_admins a
//       LEFT JOIN hrm_companys c ON a.companyId = c.id
//       LIMIT ? OFFSET ?
//     `;
//     const dataResult = await new Promise((resolve, reject) => {
//       pool.query(sql, [pageSize, offset], (err, result) => {
//         if (err) {
//           console.error('Error Fetching Admin List', err);
//           reject(err);
//         } else {
//           resolve(result);
//         }
//       });
//     });

//     // Send response with data and total count
//     res.status(200).json({
//       data: dataResult,
//       total: countResult
//     });
//   } catch (error) {
//     console.error('Error Fetching Admin List', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };
