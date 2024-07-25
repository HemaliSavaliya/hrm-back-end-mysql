const connection = require("../config/config");

module.exports.addDesignation = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            // Convert Date
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = currentDate.getMonth() + 1;
            const monthAbbreviation = monthNames[monthIndex - 1];
            const day = currentDate.getDate();
            const todayDate = `${day < 10 ? '0' : ''}${day} ${monthAbbreviation} ${year}`;

            const designationName = req.body.designationName;
            const status = req.body.status;
            const companyId = req.user.companyId;

            // Insert new designation into the database
            const addDesignationQuery = "INSERT INTO hrm_designations (companyId, designationName, startingDate, status) VALUES (?, ?, ?, ?)";

            connection.query(addDesignationQuery, [companyId, designationName, todayDate, status], (err, result) => {
                if (err) {
                    console.error('Error adding designation:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                res.status(200).json({ success: true, message: "Designation added successfully" });
            });
        } else {
            // User is not an admin or HR, deny access
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error creating designation", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.updateStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const status = req.body.status;

        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            // Update designation status in the database
            const updateStatusQuery = "UPDATE hrm_designations SET status = ? WHERE id = ?";
            connection.query(updateStatusQuery, [status, id], (err, result) => {
                if (err) {
                    console.error('Error updating designation status:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                res.status(200).json({ success: true, message: "Designation status updated successfully" });
            });
        } else {
            // User is not an admin or HR, deny access
            res.status(403).json({ success: false, message: "Access denied" });
        }
    } catch (error) {
        console.error("Error Updating designation status", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.designationList = async (req, res) => {
    try {
        // Fetch all designations from the database
        const getAllDesignationsQuery = "SELECT * FROM hrm_designations WHERE companyId = ? AND deleted = false";

        connection.query(getAllDesignationsQuery, [req.user.companyId], (err, result) => {
            if (err) {
                console.error('Error fetching designations:', err);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            
            if (result.length > 0) {
                res.status(200).json(result);
            } else {
                return res.status(404).json({ result: "No Designation found!" });
            }
        });
    } catch (error) {
        console.error("Error Fetching designation", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}