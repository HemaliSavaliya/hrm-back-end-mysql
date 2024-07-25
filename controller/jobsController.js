const connection = require("../config/config");

module.exports.addJob = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            const { jobTitle, position, department, noOfPosition, jobDescription } = req.body;

            // Insert new job into the database
            const addJobQuery = "INSERT INTO hrm_jobs_requirement (companyId, jobTitle, position, department, noOfPosition, jobDescription) VALUES (?, ?, ?, ?, ?, ?)";

            connection.query(addJobQuery, [req.user.companyId, jobTitle, position, department, noOfPosition, jobDescription], (err, result) => {
                if (err) {
                    console.error('Error adding job:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                res.status(200).json({ success: true, message: "Job added successfully" });
            });
        } else {
            // User is not an admin, deny access 
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error Creating Job", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.updateJob = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            const { jobTitle, position, department, noOfPosition, jobDescription } = req.body;

            const jobId = req.params.id;

            // Update the job in the database
            const updateJobQuery = "UPDATE hrm_jobs_requirement SET jobTitle = ?, position = ?, department = ?, noOfPosition = ?, jobDescription = ? WHERE id = ?";

            connection.query(updateJobQuery, [jobTitle, position, department, noOfPosition, jobDescription, jobId], (err, result) => {
                if (err) {
                    console.error('Error updating job:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                res.status(200).json({ success: true, message: "Job updated successfully" });
            });
        } else {
            // User is not an admin, deny access
            res.status(403).json({ error: 'Access denied' });
        }
    } catch (error) {
        console.error("Error Updating Job", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports.deleteJobs = async (req, res) => {
    try {
        const jobId = req.params.id;

        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            // Update job status to "Deleted" in the database
            const deleteJobQuery = "UPDATE hrm_jobs_requirement SET deleted = true WHERE id = ?";
            connection.query(deleteJobQuery, [jobId], (err, result) => {
                if (err) {
                    console.error('Error deleting job:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ message: "Job marked as deleted" });
            });
        } else {
            // User is not an admin, deny access
            res.status(403).json({ error: 'Access denied' });
        }
    } catch (error) {
        console.error("Error deleting Jobs", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.jobsList = async (req, res) => {
    try {
        const sql = "SELECT * FROM hrm_jobs_requirement WHERE deleted = false AND companyId = ?";

        connection.query(sql, [req.user.companyId], (err, results) => {
            if (err) {
                console.error("Error Fetching Jobs", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            if (results.length > 0) {
                res.status(200).json(results);
            } else {
                return res.status(404).json({ error: "No Jobs Found!" });
            }
        });
    } catch (error) {
        console.error("Error Fetching Jobs", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}