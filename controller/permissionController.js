const connection = require("../config/config");

module.exports.addPermission = async (req, res) => {
  try {
    if (req.user && req.user.role === "Admin") {
      const companyId = req.user.companyId;
      const { role, option_name } = req.body;

      // Insert new option details into the database
      const addPermissionQuery =
        "INSERT INTO hrm_permissions (companyId, option_name, role) VALUES (?, ?, ?)";

      connection.query(
        addPermissionQuery,
        [companyId, option_name, role],
        (err, result) => {
          if (err) {
            console.error("Error adding permission details");
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res
            .status(200)
            .json({ success: true, message: "Permission added successfully" });
        }
      );
    } else {
      // User is not an admin, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error creating option", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.deletePermission = async (req, res) => {
  try {
    if (req.user && req.user.role === "Admin") {
      const companyId = req.user.companyId;
      const { role, option_name, status } = req.body;

      // Check if a permission entry already exists for the given option_name, role, and companyId
      const checkPermissionQuery =
        "SELECT * FROM hrm_permissions WHERE companyId = ? AND option_name = ? AND role = ?";

      connection.query(
        checkPermissionQuery,
        [companyId, option_name, role],
        (err, results) => {
          if (err) {
            console.error("Error checking permission details");
            return res.status(500).json({ error: "Internal Server Error" });
          }

          if (results.length > 0) {
            // If a permission entry exists, update its status based on the provided status
            const updatePermissionQuery =
              "UPDATE hrm_permissions SET status = ? WHERE companyId = ? AND option_name = ? AND role = ?";

            connection.query(
              updatePermissionQuery,
              [status, companyId, option_name, role],
              (updateErr, updateResult) => {
                if (updateErr) {
                  console.error("Error updating permission status", updateErr);
                  return res
                    .status(500)
                    .json({ error: "Internal Server Error" });
                }

                res
                  .status(200)
                  .json({
                    success: true,
                    message: "Permission status updated successfully",
                  });
              }
            );
          } else {
            // If no permission entry exists, insert a new permission with the provided status
            const addPermissionQuery =
              "INSERT INTO hrm_permissions (companyId, option_name, role, status) VALUES (?, ?, ?, ?)";

            connection.query(
              addPermissionQuery,
              [companyId, option_name, role, status],
              (addErr, addResult) => {
                if (addErr) {
                  console.error("Error adding permission", addErr);
                  return res
                    .status(500)
                    .json({ error: "Internal Server Error" });
                }

                res
                  .status(200)
                  .json({
                    success: true,
                    message: "Permission added successfully",
                  });
              }
            );
          }
        }
      );
    } else {
      // User is not an admin, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error deleting option", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.getPermission = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { role } = req.query;

    let getPermissionQuery;
    let queryParams = [companyId];

    if (role === "Admin") {
      getPermissionQuery =
        "SELECT option_name FROM hrm_permissions WHERE companyId = ?";
    } else {
      getPermissionQuery =
        "SELECT option_name FROM hrm_permissions WHERE companyId = ? AND role = ? AND status = 'Yes'";
      queryParams.push(role);
    }

    connection.query(getPermissionQuery, queryParams, (err, results) => {
      if (err) {
        console.error("Error fetching permission details", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const permission = results.map((result) => result.option_name);
      res.status(200).json({ success: true, permission });
    });
  } catch (error) {
    console.error("Error getting permission", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
