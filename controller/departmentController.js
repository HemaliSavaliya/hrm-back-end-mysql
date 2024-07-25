const connection = require("../config/config");

module.exports.addDepartment = async (req, res) => {
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
            const startingDate = `${day < 10 ? '0' : ''}${day} ${monthAbbreviation} ${year}`;

            const { departmentName, departmentHead, departmentEmail, status } = req.body;

            // Insert new department into the database
            const addDepartmentQuery = "INSERT INTO hrm_departments (companyId, departmentName, departmentHead, departmentEmail, startingDate, status) VALUES (?, ?, ?, ?, ?, ?)";

            connection.query(addDepartmentQuery, [req.user.companyId, departmentName, departmentHead, departmentEmail, startingDate, status], (err, result) => {
                if (err) {
                    console.error('Error adding department:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ success: true, message: "Department added successfully" });
            });
        } else {
            // User is not an admin, deny access 
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error Creating Project", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.updateDepartment = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            const { id } = req.params;

            // Find the department by ID
            const department = await getDepartmentById(id);

            if (!department) {
                return res.status(404).json({ error: "Department not found" });
            }

            // Update department fields
            department.departmentHead = req.body.departmentHead || department.departmentHead;
            department.departmentEmail = req.body.departmentEmail || department.departmentEmail;

            // // Update teamMembers if provided and is an array
            // if (Array.isArray(req.body.teamMembers)) {
            //     department.teamMembers = JSON.stringify(req.body.teamMembers);
            // }

            department.status = req.body.status || department.status;

            // Update the department in the database
            const updateDepartmentQuery = "UPDATE hrm_departments SET departmentHead = ?, departmentEmail = ?, status = ? WHERE id = ?";

            connection.query(updateDepartmentQuery, [department.departmentHead, department.departmentEmail, department.status, id], (err, result) => {
                if (err) {
                    console.error('Error updating department:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                res.status(200).json({ success: true, message: "Department updated successfully" });
            });
        } else {
            // User is not an admin and HR, deny access
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error Updating Department", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Check if the user making the request is an admin or HR
        if (req.user && (req.user.role === 'Admin' || req.user.role === 'HR')) {
            // Update the department status in the database
            const updateStatusQuery = "UPDATE hrm_departments SET status = ? WHERE id = ?";
            connection.query(updateStatusQuery, [status, id], (err, result) => {
                if (err) {
                    console.error('Error updating department status:', err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                res.status(200).json({ success: true, message: "Department status updated successfully" });
            });
        } else {
            // User is not an admin or HR, deny access
            res.status(403).json({ success: false, message: 'Access Denied' });
        }
    } catch (error) {
        console.error("Error Updating Department Status:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

// module.exports.departmentList = async (req, res) => {
//     try {
//         // Query to fetch all departments
//         const getAllDepartmentsQuery = "SELECT * FROM departments WHERE companyId = ? AND deleted = false";

//         // Execute the query
//         connection.query(getAllDepartmentsQuery, [req.user.companyId], async (err, result) => {
//             if (err) {
//                 console.error('Error fetching departments:', err);
//                 return res.status(500).json({ error: "Internal Server Error" });
//             }

//             if (result.length === 0) {
//                 return res.status(404).json({ result: "No Department found!" });
//             }

//             // Array to hold modified departments with team members' names
//             const departmentsWithTeamMembers = [];

//             // Iterate over each department
//             for (const department of result) {
//                 // Deserialize the teamMembers JSON string to an array
//                 const teamMembersData = JSON.parse(department.teamMembers);

//                 // Initialize an array to hold user names
//                 const teamMembers = [];

//                 // If there are team members, query the database for their names
//                 if (teamMembersData.length > 0) {
//                     // Query to fetch names of the team members
//                     const fetchNamesQuery = `SELECT name FROM employee WHERE userId IN (?)`;

//                     // Execute the query
//                     await new Promise((resolve, reject) => {
//                         connection.query(fetchNamesQuery, [teamMembersData], (nameErr, namesResult) => {
//                             if (nameErr) {
//                                 console.error("Error fetching team members' names:", nameErr);
//                                 return reject(res.status(500).json({ error: "Internal Server Error" }));
//                             }

//                             // Extract names and push them to the array
//                             if (namesResult.length > 0) {
//                                 for (const row of namesResult) {
//                                     teamMembers.push(row.name);
//                                 }
//                             }
//                             resolve();
//                         });
//                     });
//                 }

//                 // Add team member names to the department data
//                 department.teamMembers = teamMembers;

//                 // Push modified department data to the array
//                 departmentsWithTeamMembers.push(department);
//             }

//             // Send the modified departments data as JSON response
//             res.status(200).json(departmentsWithTeamMembers);
//         });
//     } catch (error) {
//         console.error("Error fetching departments:", error);
//         return res.status(500).json({ error: "Internal Server Error" });
//     }
// };

module.exports.departmentList = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        // Query to fetch all departments
        const getAllDepartmentsQuery = "SELECT * FROM hrm_departments WHERE companyId = ? AND deleted = false";
        const departments = await query(getAllDepartmentsQuery, [companyId]);

        // Extract team member IDs
        const teamMemberIds = departments.reduce((acc, department) => {
            const teamMembersData = JSON.parse(department.teamMembers);
            return [...acc, ...teamMembersData];
        }, []);

        // Check if teamMemberIds array is not empty before executing the query
        if (teamMemberIds.length > 0) {
            // Query to fetch team members' names
            const fetchNamesQuery = "SELECT id, name FROM hrm_employees WHERE id IN (?)";
            try {
                const teamMembers = await query(fetchNamesQuery, [teamMemberIds]);

                // Create a map of team member IDs to names
                const teamMemberMap = teamMembers.reduce((acc, { id, name }) => {
                    acc[id] = name;
                    return acc;
                }, {});

                // Add team member names to the department data
                const departmentsWithTeamMembers = departments.map((department) => {
                    const teamMembersData = JSON.parse(department.teamMembers);
                    department.teamMembers = teamMembersData.map((id) => teamMemberMap[id]);
                    return department;
                });

                // Send the modified departments data as JSON response
                res.status(200).json(departmentsWithTeamMembers);
            } catch (error) {
                console.error("Error fetching team members:", error);
                return res.status(500).json({ error: "Internal Server Error" });
            }
        } else {
            // If teamMemberIds array is empty, set teamMembers field to an empty array in each department
            const departmentsWithEmptyTeamMembers = departments.map((department) => {
                return { ...department, teamMembers: [] };
            });

            // Send the modified departments data as JSON response
            res.status(200).json(departmentsWithEmptyTeamMembers);
        }
    } catch (error) {
        console.error("Error fetching departments:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// Helper function to execute a query
async function query(query, params) {
    return new Promise((resolve, reject) => {
        connection.query(query, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Function to get department by ID
async function getDepartmentById(id) {
    return new Promise((resolve, reject) => {
        const getDepartmentQuery = "SELECT * FROM hrm_departments WHERE id = ?";
        connection.query(getDepartmentQuery, [id], (err, result) => {
            if (err) {
                console.error('Error fetching department by ID:', err);
                reject(err);
            } else if (result.length === 0) {
                resolve(null); // Department not found
            } else {
                // Deserialize teamMembers from JSON string to array
                result[0].teamMembers = JSON.parse(result[0].teamMembers);
                resolve(result[0]);
            }
        });
    });
}