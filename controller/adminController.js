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

module.exports.adminListActive = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "name";
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

    const offset = (page - 1) * limit;

    // whitelist columns that can be sorted
    const validSortColumns = ["name", "email", "password", "role"];

    if (!validSortColumns.includes(sortBy)) {
      return res.status(400).json({ error: "Invalid sort column" });
    }

    // Count total active items with filtering
    const countQuery =
      "SELECT COUNT(*) AS count FROM hrm_admins WHERE name LIKE ? AND deleted = false";

    pool.query(countQuery, [`%${search}%`], (err, countResult) => {
      if (err) {
        console.error("Error counting active admin", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const totalItems = countResult[0].count || 0;
      const totalPages = Math.ceil(totalItems / limit);

      // Fetch paginated data
      const sql = `
        SELECT a.*, c.companyName AS companyName 
        FROM hrm_admins a 
        LEFT JOIN hrm_companys c ON a.companyId = c.id 
        WHERE a.deleted = false AND a.name LIKE ? 
        ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?
      `;

      pool.query(sql, [`%${search}%`, limit, offset], (err, result) => {
        if (err) {
          console.error("Error Fetching active admin", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({
          data: result,
          totalItems,
          totalPages,
          currentPage: page,
          isNext: page < totalPages,
        });
      });
    });
  } catch (error) {
    console.error("Error Fetching active admin list", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.adminListInactive = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "name";
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

    const offset = (page - 1) * limit;

    // whitelist columns that can be sorted
    const validSortColumns = ["name", "email", "password", "role"];

    if (!validSortColumns.includes(sortBy)) {
      return res.status(400).json({ error: "Invalid sort column" });
    }

    // Count total inactive items with filtering
    const countQuery =
      "SELECT COUNT(*) AS count FROM hrm_admins WHERE name LIKE ? AND deleted = true";

    pool.query(countQuery, [`%${search}%`], (err, countResult) => {
      if (err) {
        console.error("Error counting inactive admin", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const totalItems = countResult[0].count || 0;
      const totalPages = Math.ceil(totalItems / limit);

      // Fetch paginated data
      const sql = `
        SELECT a.*, c.companyName AS companyName 
        FROM hrm_admins a 
        LEFT JOIN hrm_companys c ON a.companyId = c.id 
        WHERE a.deleted = true AND a.name LIKE ? 
        ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?
      `;

      pool.query(sql, [`%${search}%`, limit, offset], (err, result) => {
        if (err) {
          console.error("Error Fetching inactive admin", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({
          data: result,
          totalItems,
          totalPages,
          currentPage: page,
          isNext: page < totalPages,
        });
      });
    });
  } catch (error) {
    console.error("Error Fetching inactive admin list", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
