const connection = require("../config/config");

module.exports.addLeaveType = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            const { companyId, leaveName, leaveBalance, leaveStatus } = req.body;

            // Convert Date
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const monthIndex = currentDate.getMonth() + 1;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthAbbreviation = monthNames[monthIndex - 1];
            const day = currentDate.getDate();
            const todayDate = `${day < 10 ? '0' : ''}${day} ${monthAbbreviation} ${year}`;

            // Insert new leave type into the database
            const addLeaveType = "INSERT INTO hrm_leavetypes (companyId, leaveName, leaveBalance, leaveStatus, leaveAddingDate) VALUES (?, ?, ?, ?, ?)";

            connection.query(addLeaveType, [companyId, leaveName, leaveBalance, leaveStatus, todayDate], (err, result) => {
                if (err) {
                    console.error("Error Adding leave type", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ success: true, message: "Leave Type Added successfully" });
            });
        } else {
            // User is not an admin or HR, deny access
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error Creating Leave Type", error);
        return res.status(403).json({ error: "Internal Server Error" });
    }
}

module.exports.updateLeaveType = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            const { leaveName, leaveBalance, leaveStatus, leaveAddingDate } = req.body;

            const leaveTypeId = req.params.id;

            // Update the leave type in the database
            const updateLeaveTypeQuery = "UPDATE hrm_leavetypes SET leaveName = ?, leaveBalance = ?, leaveStatus = ?, leaveAddingDate = ? WHERE id = ?";

            connection.query(updateLeaveTypeQuery, [leaveName, leaveBalance, leaveStatus, leaveAddingDate, leaveTypeId], (err, result) => {
                if (err) {
                    console.error("Error updating leave type", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ success: true, message: "Leave type updated successfully" });
            });
        } else {
            // User is not an admin and HR, deny access
            res.status(403).json({ error: "Access denied" });
        }
    } catch (error) {
        console.log("Error updating Leave Type", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.deleteLeaveType = async (req, res) => {
    try {
        const leaveTypeId = req.params.id;

        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            // Update leave type status to 'Deleted' in the database
            const deleteLeaveTypeQuery = "UPDATE hrm_leavetypes SET deleted = true WHERE id = ?";

            connection.query(deleteLeaveTypeQuery, [leaveTypeId], (err, result) => {
                if (err) {
                    console.error("Error deleting leave type");
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ message: "Leave type marked as deleted" });
            });
        } else {
            // User is not an admin, deny access
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error deleting Leave Type", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.updateLeaveStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const leaveStatus = req.body.leaveStatus;

        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            // Update the leave status in the database
            const updateStatusQuery = "UPDATE hrm_leavetypes SET leaveStatus = ? WHERE id = ?";

            connection.query(updateStatusQuery, [leaveStatus, id], (err, result) => {
                if (err) {
                    console.error('Error updating Leave type status:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                res.status(200).json({ success: true, message: "Leave type status updated successfully" });
            });
        } else {
            // User is not an admin, deny access
            res.status(403).json({ success: false, message: "Access Denied" });
        }
    } catch (error) {
        console.error("Error Updating Leave type Status:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.leaveTypeList = async (req, res) => {
    try {
        const sql = "SELECT * FROM hrm_leavetypes WHERE deleted = false AND companyId = ?";

        connection.query(sql, [req.user.companyId], (err, results) => {
            if (err) {
                console.error("Error Fetching Leave Type", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            if (results.length > 0) {
                res.status(200).json(results);
            } else {
                return res.status(404).json({ error: "No Leave Type Found!" });
            }
        });
    } catch (error) {
        console.error("Error Fetching Leave Type", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}