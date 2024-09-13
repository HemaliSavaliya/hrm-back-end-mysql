const connection = require("../config/config");

module.exports.addHoliday = async (req, res) => {
  try {
    // Check if the user making the request is an admin or Hr
    if (req.user || (req.user.role === "Admin" && req.user.role === "HR")) {
      // Convert Date
      const date = new Date(req.body.date);
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
      const monthAbbreviation = monthNames[date.getMonth()];
      const dateFormatted = `${date.getDate()} ${monthAbbreviation} ${date.getFullYear()}`;

      const { name } = req.body;

      // Insert new holiday in to database
      const addHolidayQuery =
        "INSERT INTO hrm_holidays (companyId, name, date, deleted) VALUES (?, ?, ?, ?)";

      connection.query(
        addHolidayQuery,
        [req.user.companyId, name, dateFormatted, false],
        (err, result) => {
          if (err) {
            console.error("Error Adding Holiday:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res
            .status(200)
            .json({ success: true, message: "Holiday added successfully" });
        }
      );
    } else {
      // User is not an admin, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error creating holiday:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.updateHoliday = async (req, res) => {
  try {
    // Check if the user making the request is an admin or HR
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      const { id } = req.params;

      // Find the holiday by ID
      const holiday = await getHolidayById(id);

      if (!holiday) {
        return res.status(404).json({ error: "Holiday not found" });
      }

      // Update holiday fields
      holiday.name = req.body.name || holiday.name;

      // Convert and format the date if provided
      let dateFormatted = holiday.date; // Use the current end date as default
      if (req.body.date) {
        const date = new Date(req.body.date);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ error: "Invalid date format" });
        }
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
        const monthAbbreviation = monthNames[date.getMonth()];
        dateFormatted = `${date.getDate()} ${monthAbbreviation} ${date.getFullYear()}`;
      }
      holiday.date = dateFormatted;

      // Update the holiday in the database
      const updateHolidayQuery =
        "UPDATE hrm_holidays SET name = ?, date = ? WHERE id = ?";

      connection.query(
        updateHolidayQuery,
        [holiday.name, holiday.date, id],
        (err, result) => {
          if (err) {
            console.error("Error updating holiday:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }
          res
            .status(200)
            .json({ success: true, message: "Holiday updated successfully" });
        }
      );
    } else {
      // User is not an admin or HR, deny access
      return res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error Updating Holiday:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Function to get holiday by ID
async function getHolidayById(id) {
  return new Promise((resolve, reject) => {
    const getHolidayQuery = "SELECT * FROM hrm_holidays WHERE id = ?";
    connection.query(getHolidayQuery, [id], (err, result) => {
      if (err) {
        console.error("Error fetching holiday by ID:", err);
        reject(err);
      } else if (result.length === 0) {
        resolve(null); // holiday not found
      } else {
        resolve(result[0]); // resolve with the holiday data
      }
    });
  });
}

module.exports.deleteHoliday = async (req, res) => {
  try {
    // Check if the user making the request is an admin or HR
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      const holidayId = req.params.id;

      const deleteHolidayQuery =
        "UPDATE hrm_holidays SET deleted = true WHERE id = ?";

      connection.query(deleteHolidayQuery, [holidayId], (err, result) => {
        if (err) {
          console.error("Error deleting holiday", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({ message: "Holiday marked as deleted" });
      });
    } else {
      // User is not an admin and HR, dent access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error deleting Holiday:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.holidayList = async (req, res) => {
  try {
    const sql =
      "SELECT * FROM hrm_holidays WHERE deleted = false AND companyId = ?";

    connection.query(sql, [req.user.companyId], (err, results) => {
      if (err) {
        console.error("Error Fetching Holidays:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (results.length > 0) {
        res.status(200).json(results);
      } else {
        return res.status(404).json({ error: "No Holiday Found!" });
      }
    });
  } catch (error) {
    console.error("Error fetching holiday:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
