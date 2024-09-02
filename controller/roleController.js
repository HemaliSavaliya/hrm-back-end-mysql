const connection = require("../config/config");

module.exports.addRole = async (req, res) => {
  try {
    // Check if the user making the request is an admin or HR
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      // Convert Date
      const currentDate = new Date();
      const year = currentDate.getFullYear();
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
      const monthIndex = currentDate.getMonth() + 1;
      const monthAbbreviation = monthNames[monthIndex - 1];
      const day = currentDate.getDate();
      const todayDate = `${
        day < 10 ? "0" : ""
      }${day} ${monthAbbreviation} ${year}`;

      const { roleName, status } = req.body;
      const companyId = req.body.companyId;

      // Insert new role into the database
      const addRoleQuery =
        "INSERT INTO hrm_roles (companyId, roleName, date, status) VALUES (?, ?, ?, ?)";

      connection.query(
        addRoleQuery,
        [companyId, roleName, todayDate, status],
        (err, result) => {
          if (err) {
            console.error("Error adding role", err);
            return res.status(500).json({ error: "Internal Server Error " });
          }

          res
            .status(200)
            .json({ success: true, message: "Role added successfully" });
        }
      );
    } else {
      // User is not an admin or HR, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error creating role:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.updateRoleStatus = async (req, res) => {
  try {
    // Check if the user making the request is an admin or HR
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      const status = req.body.status;
      const id = req.params.id;

      // Update role status in database
      const updateStatusQuery = "UPDATE hrm_roles SET status = ? WHERE id = ?";

      connection.query(updateStatusQuery, [status, id], (err, result) => {
        if (err) {
          console.error("Error updating role status", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        res
          .status(200)
          .json({ success: true, message: "Role status updated successfully" });
      });
    } else {
      // User is not an admin and HR, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error updating role status:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// module.exports.roleList = async (req, res) => {
//   try {
//     // Fetch all role from the database
//     const getAllRole = "SELECT * FROM hrm_roles WHERE companyId = ?";

//     connection.query(getAllRole, [req.user.companyId], (err, result) => {
//       if (err) {
//         console.error("Error fetching role", err);
//         return res.status(500).json({ error: "Internal Server Error" });
//       }

//       if (result.length > 0) {
//         res.status(200).json(result);
//       } else {
//         return res.status(404).json({ error: "No role found!" });
//       }
//     });
//   } catch (error) {
//     console.error("Error Fetching role list:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

module.exports.roleList = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const companyId = req.query.companyId;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "roleName";
    const sortOrder = req.query.sortOrder || "asc";

    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required" });
    }

    const offset = (page - 1) * limit;

    // Count total items with filtering
    const countQuery = `
      SELECT COUNT(*) AS count 
      FROM hrm_roles 
      WHERE companyId = ? AND roleName LIKE ?
    `;
    connection.query(
      countQuery,
      [companyId, `%${search}%`],
      (err, countResult) => {
        if (err) {
          console.error("Error counting roles:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        const totalItems = countResult[0].count || 0;
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch paginated data with sorting and filtering
        const dataQuery = `
        SELECT * 
        FROM hrm_roles 
        WHERE companyId = ? AND roleName LIKE ? 
        ORDER BY ${sortBy} ${sortOrder} 
        LIMIT ? OFFSET ?
      `;
        connection.query(
          dataQuery,
          [companyId, `%${search}%`, limit, offset],
          (err, dataResult) => {
            if (err) {
              console.error("Error fetching roles:", err);
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
      }
    );
  } catch (error) {
    console.error("Error fetching role list:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.getAllRolesName = async (req, res) => {
  try {
    const getAllRolesQuery =
      "SELECT roleName FROM hrm_roles WHERE companyId = ? AND status = 'Enable'";

    connection.query(getAllRolesQuery, [req.user.companyId], (err, results) => {
      if (err) {
        console.error("Error fetching roles", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const roles = results.map((result) => result.roleName);
      res.status(200).json({ success: true, roles });
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
