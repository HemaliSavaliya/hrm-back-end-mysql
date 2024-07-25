const connection = require("../config/config");
const bcrypt = require('bcrypt');

module.exports.addAdmin = async (req, res) => {
    try {
        // Check if the user making the request is an superAdmin
        if (req.user && req.user.role === "SuperAdmin") {
            const { companyId, name, email, password, role } = req.body;

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert the new admin into the admin table
            const insertSql = `INSERT INTO hrm_admins (companyId, name, email, password, role) VALUES (?, ?, ?, ?, ?)`;

            connection.query(insertSql, [companyId, name, email, hashedPassword, role || 'Admin'], (err, result) => {
                if (err) {
                    console.error("Error Adding Admin:", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ success: true, message: "Admin Added Successfully" });
            });
        } else {
            // User is not an superAdmin, deny access
            res.status(403).json({ error: 'Access denied' });
        }
    } catch (error) {
        console.error("Error creating admin", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.updateAdmin = async (req, res) => {
    try {
        // Check if the user making the request is an superAdmin
        if (req.user && req.user.role === "SuperAdmin") {
            const { companyId, name, email } = req.body;

            const adminId = req.params.id;

            // Update the admin in database
            const updateAdminQuery = "UPDATE hrm_admins SET companyId = ?, name = ?, email = ? WHERE id = ?";

            connection.query(updateAdminQuery, [companyId, name, email, adminId], (err, result) => {
                if (err) {
                    console.error("Error updating admin:", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ success: true, message: "Admin updated successfully" });
            });
        } else {
            // User is not an superAdmin, deny access
            res.status(403).json({ error: 'Access denied' });
        }
    } catch (error) {
        console.error("Error updating admin", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.deleteAdmin = async (req, res) => {
    try {
        // Check if the user making the request is an superAdmin
        if (req.user && req.user.role === "SuperAdmin") {
            const adminId = req.params.id;

            const checkAdminQuery = "SELECT deleted FROM hrm_admins WHERE id = ?";

            connection.query(checkAdminQuery, [adminId], (err, result) => {
                if (err) {
                    console.error("Error Checking Admin", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                if (result.length === 0) {
                    return res.status(404).json({ error: "Admin not found" });
                }

                const isDeleted = result[0].deleted;

                // Update the admin status based on its current state
                const toggleAdminQuery = isDeleted ? "UPDATE hrm_admins SET deleted = false WHERE id = ?" : "UPDATE hrm_admins SET deleted = true WHERE id = ?";

                connection.query(toggleAdminQuery, [adminId], (err, result) => {
                    if (err) {
                        console.error("Error Toggling Admin Status", err);
                        return res.status(500).json({ error: "Internal Server Error" });
                    }

                    const message = isDeleted ? "Admin marked as undeleted" : "Admin marked as deleted";

                    res.status(200).json({ message });
                });
            });
        } else {
            // User is not an superAdmin, deny access
            res.status(403).json({ error: 'Access denied' });
        }
    } catch (error) {
        console.error("Error deleting admin", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.adminList = async (req, res) => {
    try {
        const sql = "SELECT a.*, c.companyName AS companyId FROM hrm_admins a LEFT JOIN hrm_companys c ON a.companyId = c.id";

        connection.query(sql, (err, result) => {
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
}