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

// module.exports.adminList = async (req, res) => {
//   try {
//     const sql =
//       "SELECT a.*, c.companyName AS companyId FROM hrm_admins a LEFT JOIN hrm_companys c ON a.companyId = c.id";

//     pool.query(sql, (err, result) => {
//       if (err) {
//         console.error("Error Fetching Admin List", err);
//         return res.status(500).json({ error: "Internal Server Error" });
//       }

//       if (result.length > 0) {
//         res.status(200).json(result);
//       } else {
//         res.status(404).json({ error: "No Admin Found!" });
//       }
//     });
//   } catch (error) {
//     console.error("Error Fetching Admin List", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

module.exports.adminList = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Count total items
    const countQuery = "SELECT COUNT(*) AS count FROM hrm_admins";
    console.log("Count Result:", countQuery);
    const countResult = await pool.query(countQuery);
    console.log("Result:", countResult);
    const totalItems = countResult || 0; // Safeguard with optional chaining and default value
    console.log("item Result:", totalItems);
    const totalPages = Math.ceil(totalItems / limit);
    console.log("pages Result:", totalPages);

    // Fetch paginated data
    const sql = `
      SELECT a.*, c.companyName AS companyName 
      FROM hrm_admins a 
      LEFT JOIN hrm_companys c ON a.companyId = c.id 
      LIMIT ? OFFSET ?
    `;

    pool.query(sql, [limit, skip], (err, result) => {
      if (err) {
        console.error("Error Fetching Admin List", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      res.status(200).json({
        data: result,
        totalItems,
        totalPages,
        currentPage: page,
        isNext: page < totalPages,
        total: result.length,
      });
    });
  } catch (error) {
    console.error("Error Fetching Admin List", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// module.exports.adminList = async (req, res) => {
//   const page = req.query.page;
//   const limit = Number(req.query.limit);
//   const isPaginationRequired = Boolean(page && limit);
//   const skip = (Number(page) - 1) * Number(limit);

//   const sql = `SELECT a.*, c.companyName AS companyId FROM hrm_admins a LEFT JOIN hrm_companys c ON a.companyId = c.id LIMIT ?, ?`;
//   const params = [skip, limit];

//   const getTotalItems = async () => {
//     const sql = `SELECT COUNT(*) AS totalItems FROM hrm_admins`;
//     return new Promise((resolve, reject) => {
//       pool.query(sql, (err, result) => {
//         if (err) {
//           console.error("Error fetching total items:", err);
//           return reject(err);
//         }
//         if (result.length === 0) {
//           return resolve({ totalItems: 0 });
//         }
//         resolve(result[0]);
//       });
//     });
//   };

//   pool.query(sql, params, async (err, result) => {
//     if (err) {
//       console.error("Error Fetching Admin List", err);
//       return res.status(500).json({ error: "Internal Server Error" });
//     }

//     if (result.length > 0) {
//       try {
//         const totalItemsResult = await getTotalItems();
//         const totalItems = totalItemsResult.totalItems;
//         const totalPages = Math.ceil(totalItems / Number(limit)) || 1;
//         res.status(200).json({
//           data: result,
//           totalItems,
//           totalPages,
//           currentPage: page,
//           isNext: Number(page) < Number(totalPages),
//           total: result.length,
//         });
//       } catch (error) {
//         console.error("Error fetching total items:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     } else {
//       res.status(404).json({ error: "No Admin Found!" });
//     }
//   });
// };
