const connection = require("../config/config");

module.exports.addLeaveRequest = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "HR" || req.user.role === "Employee")) {
            // Fetch the leave type details based on the leaveName received in the request
            const leaveTypeDetailsQuery = "SELECT * FROM hrm_leavetypes WHERE leaveName = ?";

            connection.query(leaveTypeDetailsQuery, [req.body.leaveName], (err, results) => {
                if (err) {
                    console.error("Error fetching leave type details", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                if (results.length === 0) {
                    return res.status(404).json({ error: "Leave type not found" });
                }

                const leaveTypeDetails = results[0];

                // Fetch leave requests data for the previous month
                const currentDate = new Date();
                const year = currentDate.getFullYear();
                const monthIndex = currentDate.getMonth() + 1;
                const previousMonthStartDate = new Date(year, monthIndex - 2, 1);
                const previousMonthEndDate = new Date(year, monthIndex - 1, 0);

                const previousMonthLeaveRequestsQuery = `
                  SELECT * FROM hrm_leaverequests 
                  WHERE userId = ? 
                  AND startDate >= ? 
                  AND endDate <= ?
                `;

                connection.query(previousMonthLeaveRequestsQuery, [req.user.id, previousMonthStartDate, previousMonthEndDate], async (err, previousMonthLeaveRequests) => {
                    if (err) {
                        console.error("Error fetching previous month leave requests", err);
                        return res.status(500).json({ error: "Internal Server Error" });
                    }

                    // Calculate the total balanced leave for the previous month
                    const previousMonthTotalBalanced = previousMonthLeaveRequests.reduce((total, request) => {
                        return total + request.balanced;
                    }, 0);

                    const carriedForward = previousMonthTotalBalanced;

                    // Calculate the total days according to the leaveType
                    let totalDays;
                    if (req.body.leaveType === "Full Day") {
                        if (req.body.endDate === null) {
                            totalDays = 0.5;
                        } else if (req.body.startDate === req.body.endDate) {
                            totalDays = 1; // Single full day
                        } else {
                            const startDate = new Date(req.body.startDate);
                            const endDate = new Date(req.body.endDate);
                            totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
                        }
                    } else {
                        totalDays = 0.5; // Half day
                    }

                    // Convert Date
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthAbbreviation = monthNames[monthIndex - 1];
                    const day = currentDate.getDate();
                    const todayDate = `${day < 10 ? '0' : ''}${day} ${monthAbbreviation} ${year}`;

                    // Convert start date and end date to current date format
                    const startDate = new Date(req.body.startDate);
                    const startDateFormatted = `${startDate.getDate()} ${monthAbbreviation} ${year}`;

                    // Convert start date and end date to current date format
                    let endDateFormatted;
                    if (req.body.endDate) {
                        const endDate = new Date(req.body.endDate);
                        endDateFormatted = `${endDate.getDate()} ${monthAbbreviation} ${year}`;
                    } else {
                        endDateFormatted = null;
                    }

                    // Insert new leave request into the database
                    const insertLeaveRequestQuery = `
                      INSERT INTO hrm_leaverequests 
                      (companyId, userId, userName, userRole, leaveType, leaveName, applyingDate, totalDays, startDate, endDate, description, status, entitled, utilized, balanced, carriedForward) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const insertLeaveRequestValues = [
                        req.user.companyId,
                        req.user.id,
                        req.user.name,
                        req.user.role,
                        req.body.leaveType,
                        leaveTypeDetails.leaveName,
                        todayDate,
                        totalDays,
                        startDateFormatted,
                        endDateFormatted,
                        req.body.description,
                        req.body.status || "Pending",
                        leaveTypeDetails.leaveBalance,
                        req.body.utilized || 0,
                        leaveTypeDetails.leaveBalance,
                        carriedForward
                    ];

                    connection.query(insertLeaveRequestQuery, insertLeaveRequestValues, async (err, result) => {
                        if (err) {
                            console.error("Error inserting leave request", err);
                            return res.status(500).json({ error: "Internal Server Error" });
                        }

                        const newLeaveRequestId = result.insertId;
                        res.status(200).json({ message: "Leave request created successfully", leaveRequestId: newLeaveRequestId });
                    });
                });
            });
        } else {
            // User is not an HR, deny access
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error Creating Leave Request", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.updateLeaveReqStatus = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (!req.user || (req.user.role !== "Admin" && req.user.role !== "HR")) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { leaveRequestId, newStatus } = req.body;

        // Validate if newStatus is one of the allowed values
        const allowedStatusValues = ["Approved", "Rejected"];
        if (!allowedStatusValues.includes(newStatus)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        // Find the leave request by ID
        const findLeaveRequestQuery = "SELECT * FROM hrm_leaverequests WHERE id = ?";
        connection.query(findLeaveRequestQuery, [leaveRequestId], async (err, results) => {
            if (err) {
                console.error("Error finding leave request", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Leave request not found' });
            }

            const leaveRequest = results[0];

            // Calculate updated values based on newStatus
            let updateFields = { status: newStatus };
            if (newStatus === 'Approved') {
                const totalDays = leaveRequest.totalDays;
                updateFields.utilized = leaveRequest.utilized + totalDays;
                updateFields.balanced = leaveRequest.entitled - updateFields.utilized;
            }

            // Update the leave request
            const updateLeaveRequestQuery = "UPDATE hrm_leaverequests SET ? WHERE id = ?";
            connection.query(updateLeaveRequestQuery, [updateFields, leaveRequestId], async (err, result) => {
                if (err) {
                    console.error("Error updating leave request status", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: "Leave request not found" });
                }

                // Return updated leave request
                const updatedLeaveRequest = { ...leaveRequest, ...updateFields };
                res.status(200).json({ message: "Leave status updated successfully", leaveRequest: updatedLeaveRequest });
            });
        });
    } catch (error) {
        console.error('Error Updating Leave Request Status', error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

module.exports.leaveRequestList = async (req, res) => {
    try {
        // Retrieve the user ID from the authenticated user
        const userId = req.user.id;

        // Fetch Leave requests for the logged-in-user
        const fetchLeaveRequestsQuery = "SELECT * FROM hrm_leaverequests WHERE userId = ? AND companyId = ? AND deleted = false";

        connection.query(fetchLeaveRequestsQuery, [userId, req.user.companyId], (err, results) => {
            if (err) {
                console.error("Error fetching leave requests", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ result: "No Leave Request Found!" });
            }

            res.status(200).json(results);
        });
    } catch (error) {
        console.error("Error Fetching Leave Request", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.leaveRequestListRoleWise = async (req, res) => {
    try {
        // Retrieve the user role from the authenticated user
        const { role, companyId } = req.user;

        let fetchLeaveRequestsQuery;

        if (role === "Admin") {
            // If the user is an admin, fetch all leave requests for the company
            fetchLeaveRequestsQuery = "SELECT * FROM hrm_leaverequests WHERE deleted = false AND companyId = ?";
        } else if (role === "HR") {
            // If the user is HR, fetch only employee leave requests for the same company
            fetchLeaveRequestsQuery = "SELECT * FROM hrm_leaverequests WHERE userRole = 'Employee' AND companyId = ? AND deleted = false";
        } else {
            // If the user is an employee, fetch only their own leave requests
            fetchLeaveRequestsQuery = "SELECT * FROM hrm_leaverequests WHERE userId = ? AND companyId = ? AND deleted = false";
        }

        connection.query(fetchLeaveRequestsQuery, [companyId, companyId], (err, result) => {
            if (err) {
                console.error("Error fetching leave requests", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ result: "No Leave Request Found!" });
            }

            res.status(200).json(result);
        });
    } catch (error) {
        console.error("Error Fetching Leave Request", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


module.exports.fetchLeaveBalance = async (req, res) => {
    try {
        // Retrieve the user ID from the authenticated user
        const userId = req.user.id;

        const fetchLeaveTypesQuery = "SELECT leaveName, leaveBalance FROM hrm_leavetypes WHERE companyId = ? AND deleted = false";

        connection.query(fetchLeaveTypesQuery, [req.user.companyId], (err, leaveTypes) => {
            if (err) {
                console.error("Error fetching Leave Types", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            const fetchLeaveRequestsQuery = "SELECT * FROM hrm_leaverequests WHERE userId = ? AND companyId = ? AND deleted = false";

            connection.query(fetchLeaveRequestsQuery, [userId, req.user.companyId], (err, leaveRequests) => {
                if (err) {
                    console.error("Error fetching Leave Requests", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                // Calculate the total utilized, balanced, and carried forward for each leave type
                const leaveData = leaveTypes.map((leaveType) => {
                    const { leaveName, leaveBalance } = leaveType;
                    const leaveTypeRequests = leaveRequests.filter((request) => request.leaveName === leaveName);

                    const totalUtilized = leaveTypeRequests.reduce((acc, curr) => acc + curr.utilized, 0);
                    const totalCarriedForward = leaveTypeRequests.reduce((acc, curr) => acc + curr.carriedForward, 0);
                    const totalBalanced = leaveBalance - totalUtilized + totalCarriedForward;

                    return {
                        leaveName,
                        leaveBalance,
                        totalUtilized,
                        totalBalanced,
                        totalCarriedForward,
                    };
                });

                res.status(200).json(leaveData);
            });
        });
    } catch (error) {
        console.error("Error Fetching Leave Data", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

// // Fetch leave requests data for the previous year
// const previousYear = year - 1;
// const previousYearStartDate = `${previousYear}-01-01`;
// const previousYearEndDate = `${previousYear}-12-31`;

// const previousYearLeaveRequests = await LeaveRequest.find({
//     userId: req.user._id,
//     startDate: { $gte: previousYearStartDate },
//     endDate: { $lte: previousYearEndDate }
// });

// // Calculate the total balanced leave for the previous year
// const previousYearTotalBalanced = previousYearLeaveRequests.reduce((total, request) => {
//     return total + request.balanced;
// }, 0);

// // Calculate carriedForward for the current year
// const carriedForward = previousYearTotalBalanced;