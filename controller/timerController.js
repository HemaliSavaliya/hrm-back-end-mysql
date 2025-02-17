const connection = require("../config/config");

module.exports.addTimerData = (req, res) => {
  try {
    // Check if the user making the request is authorized
    if (req.user && (req.user.role === "HR" || req.user.role === "Employee")) {
      // Assuming startTime, stopTime are in the format "hh:mm:ss AM/PM"
      const startTime = new Date(req.body.date + " " + req.body.startTime);
      const stopTime = new Date(req.body.date + " " + req.body.stopTime);

      // Check if the date parsing is successful
      if (isNaN(startTime) || isNaN(stopTime)) {
        throw new Error("Invalid date format");
      }

      // Calculate the time difference in milliseconds
      const timeDifference = (stopTime - startTime) / (1000 * 60 * 60).toFixed(2);

      // Check if the time difference is a valid number
      if (isNaN(timeDifference)) {
        throw new Error("Invalid time difference");
      }

      // Calculate the time difference to hours
      const totalHours = parseFloat(timeDifference);

      // Set a threshold for total working hours (e.g., 8 hours)
      const requiredHours = 8;

      // Determine status based on total working hours
      let status = "Absent";
      if (totalHours >= requiredHours) {
        status = "Present";
      } else if (totalHours > 0) {
        status = "Late";
      }

      const productionHours = totalHours; // For this example, production time equals total hours.

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
      const startingDate = `${day < 10 ? "0" : ""
        }${day} ${monthAbbreviation} ${year}`;

      const insertTimerQuery = `INSERT INTO hrm_timer_tracker (companyId, date, userId, userName, projectName, description, role, startTime, resumeTime, pauseTime, stopTime, hours, minutes, seconds, totalHours, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        req.user.companyId,
        startingDate,
        req.user.id,
        req.user.name,
        req.body.projectName || null,
        req.body.description,
        req.user.role,
        req.body.startTime,
        req.body.resumeTime,
        req.body.pauseTime,
        req.body.stopTime,
        req.body.hours,
        req.body.minutes,
        req.body.seconds,
        totalHours,
        productionHours,
        status,
        false,
      ];

      connection.query(insertTimerQuery, values, (error, results) => {
        if (error) {
          console.error("Error adding timer data", error);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({ message: "Timer data added successfully" });
      });
    } else {
      // User is not authorized
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error adding timer data", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.timerList = async (req, res) => {
  try {
    // Retrieve the userId from the authenticated user
    const userId = req.user.id;

    // Fetch timer data for the logged in user
    const getTimerQuery =
      "SELECT * FROM hrm_timer_tracker WHERE deleted = false AND userId = ? AND companyId = ?";

    connection.query(
      getTimerQuery,
      [userId, req.user.companyId],
      (error, results) => {
        if (error) {
          console.error("Error fetching timer data", error);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        if (results.length > 0) {
          res.status(200).json(results);
        } else {
          return res.status(404).json({ result: "No Timer Data Found!" });
        }
      }
    );
  } catch (error) {
    console.error("Error Fetching Timer Data", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.timerListRoleWise = async (req, res) => {
  try {
    const userRole = req.user.role;
    let getTimerQuery;

    if (userRole === "Admin") {
      getTimerQuery =
        "SELECT * FROM hrm_timer_tracker WHERE companyId = ? AND deleted = false";
    } else if (userRole === "HR") {
      // HR can only see employee timer data
      getTimerQuery =
        "SELECT * FROM hrm_timer_tracker WHERE role = 'Employee' AND companyId = ? AND deleted = false";
    } else {
      // Non-admin, non-HR users are not authorized
      return res.status(403).json({ error: "Access Denied" });
    }

    connection.query(getTimerQuery, [req.user.companyId], (error, results) => {
      if (error) {
        console.error("Error fetching role-wise attendance data", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (results.length > 0) {
        res.status(200).json(results);
      } else {
        return res.status(404).json({ result: "No Data found!" });
      }
    });
  } catch (error) {
    console.error("Error Fetching Role wise attendance", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// module.exports.timerList = async (req, res) => {
//     try {
//         // Retrieve the userId from the authenticated user
//         const userId = req.user.id;

//         // Filter projects to only include those less than one month old
//         const oneMonthAgo = new Date();
//         oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

//         const timerData = await Timer.find({ userId, date: { $gte: oneMonthAgo } });

//         if (timerData.length > 0) {
//             res.send(timerData);
//         } else {
//             res.send({ result: "No Timer Data Found!" });
//         }
//     } catch (error) {
//         console.error("Error Fetching Leave Type", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// }
