const connection = require("../config/config");

module.exports.addAwards = async (req, res) => {
    try {
        // Check if the user making the request is an admin or HR
        if (req.user || (req.user.role === "Admin" && req.user.role === "HR")) {

            // Check if the provided employeeId and employeeName exist in the users collection or not
            const userQuery = "SELECT id, name FROM hrm_employees WHERE id = ? AND name = ?";

            connection.query(userQuery, [req.body.employeeId, req.body.employeeName], async (userErr, userResults) => {
                if (userErr) {
                    console.error("Error checking user:", userErr);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                if (userResults.length === 0) {
                    // If the user doesn't exist, return an error
                    return res.status(404).json({ error: "Invalid userId or name" });
                }

                // Check if an award with the same userId and name already exists
                const existingAwardQuery = "SELECT * FROM hrm_awards WHERE employeeId = ? AND companyId = ? AND employeeName = ? AND awardsName = ?";

                connection.query(existingAwardQuery, [userResults[0].id, userResults[0].companyId, userResults[0].name, req.body.awardsName], async (awardErr, awardResults) => {
                    if (awardErr) {
                        console.error("Error checking existing award:", awardErr);
                        return res.status(500).json({ error: "Internal Server Error" });
                    }

                    if (awardResults.length > 0) {
                        // If an award already exists for the same user, return an error
                        return res.status(400).json({ error: "Employee already has this award" });
                    }

                    // If the user exists and no existing award, proceed to save the award
                    const insertQuery = "INSERT INTO hrm_awards (companyId, awardsName, awardsDetails, employeeId, employeeName, reward) VALUES (?, ?, ?, ?, ?, ?)";

                    connection.query(insertQuery, [req.user.companyId, req.body.awardsName, req.body.awardsDetails, userResults[0].id, userResults[0].name, req.body.reward], async (insertErr, insertResults) => {
                        if (insertErr) {
                            console.error("Error inserting award:", insertErr);
                            return res.status(500).json({ error: "Internal Server Error" });
                        }

                        res.status(200).json({ success: true, message: "Award added successfully" });
                    });
                });
            });
        } else {
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error Creating awards", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.updateAwards = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            const { awardsName, awardsDetails, employeeId, employeeName, reward } = req.body;

            const awardId = req.params.id;

            // Update the award in the database
            const updateAwardQuery = "UPDATE hrm_awards SET awardsName = ?, awardsDetails = ?, employeeId = ?, employeeName = ?, reward = ? WHERE id = ?";

            connection.query(updateAwardQuery, [awardsName, awardsDetails, employeeId, employeeName, reward, awardId], (err, result) => {
                if (err) {
                    console.error('Error updating Awards:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                res.status(200).json({ success: true, message: "Awards updated successfully" });
            });
        } else {
            // User is not an admin or HR, deny access
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error updating awards", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.deleteAwards = async (req, res) => {
    try {
        const awardId = req.params.id;

        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            // Update job status to "Deleted" in the database
            const deletedJobQuery = "UPDATE hrm_awards SET deleted = true WHERE id = ?";

            connection.query(deletedJobQuery, [awardId], (err, result) => {
                if (err) {
                    console.error("Error Deleting award", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ message: "Awards marked as deleted" });
            });
        } else {
            // User is not an admin and HR, deny access
            res.status(403).json({ error: "Access denied" });
        }
    } catch (error) {
        console.error("Error deleting awards", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.awardsList = async (req, res) => {
    try {
        const sql = "SELECT * FROM hrm_awards WHERE deleted = false AND companyId = ?";

        connection.query(sql, [req.user.companyId], (err, results) => {
            if (err) {
                console.error("Error Fetching Awards", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            if (results.length > 0) {
                res.status(200).json(results);
            } else {
                return res.status(404).json({ error: "No Awards Found!" });
            }
        });
    } catch (error) {
        console.error("Error Listing awards", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}