const connection = require("../config/config");

module.exports.getUserDetails = async (req, res) => {
    try {
        const user = req.user; // Extracted from the token middleware

        let sql;
        if (user.role === 'SuperAdmin') {
            sql = `SELECT * FROM hrm_superadmin WHERE id = ?`;
        } else if (user.role === 'Admin') {
            sql = `SELECT * FROM hrm_admins WHERE id = ?`;
        } else {
            sql = `SELECT * FROM hrm_employees WHERE id = ?`;
        }

        connection.query(sql, [user.id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const userDetails = result[0];
            res.status(200).json({ data: userDetails });
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports.fetchLeaveDetails = async (req, res) => {
    try {
        const employeeId = req.user.id;

        // Fetch total leave details for the logged-in user
        const totalLeaveQuery = 'SELECT * FROM hrm_leaverequests WHERE userId = ?';
        connection.query(totalLeaveQuery, [employeeId], (err, totalLeaveRows) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }

            // Count total approved leave
            const approvedLeaveQuery = 'SELECT COUNT(*) AS totalApproved FROM hrm_leaverequests WHERE userId = ? AND status = "Approved"';
            connection.query(approvedLeaveQuery, [employeeId], (err, approvedLeaveRows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Server error');
                }

                // Count total rejected leave
                const rejectedLeaveQuery = 'SELECT COUNT(*) AS totalRejected FROM hrm_leaverequests WHERE userId = ? AND status = "Rejected"';
                connection.query(rejectedLeaveQuery, [employeeId], (err, rejectedLeaveRows) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Server error');
                    }

                    // Count total pending leave
                    const pendingLeaveQuery = 'SELECT COUNT(*) AS totalPending FROM hrm_leaverequests WHERE userId = ? AND status = "Pending"';
                    connection.query(pendingLeaveQuery, [employeeId], (err, pendingLeaveRows) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Server error');
                        }

                        // Fetch timer data for the logged-in user
                        const timerQuery = 'SELECT * FROM hrm_timer_tracker WHERE deleted = false AND userId = ? AND companyId = ?';
                        connection.query(timerQuery, [employeeId, req.user.companyId], (error, timerRows) => {
                            if (error) {
                                console.error("Error fetching timer data", error);
                                return res.status(500).json({ error: "Internal Server Error" });
                            }

                            let absentDays = 0;
                            let workedDays = 0;
                            let lossOfPayDays = 0;
                            const requiredHours = 8;

                            timerRows.forEach(timer => {
                                if (timer.totalHours >= requiredHours) {
                                    workedDays++;
                                } else {
                                    absentDays++;
                                    if (timer.totalHours > 0) {
                                        lossOfPayDays++;
                                    }
                                }
                            });

                            const response = {
                                // totalLeave: totalLeaveRows,
                                totalLeave: totalLeaveRows.length,
                                totalApprovedLeave: approvedLeaveRows[0].totalApproved,
                                totalRejectedLeave: rejectedLeaveRows[0].totalRejected,
                                totalPendingLeave: pendingLeaveRows[0].totalPending,
                                // timerData: timerRows,
                                // totalDays: timerRows.length,
                                absentDays: absentDays,
                                workedDays: workedDays,
                                lossOfPayDays: lossOfPayDays
                            };

                            res.json(response);
                        });
                    });
                });
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};