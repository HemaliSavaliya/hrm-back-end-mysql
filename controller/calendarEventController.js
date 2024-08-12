const connection = require("../config/config");

module.exports.addCalendarEvent = async (req, res) => {
  try {
    // Check if the user making the request is an admin
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      // Check if the provided todoId exist in the todos collection or not
      const todoId = req.body.todoId;

      // Check if the todoId exists
      const checkTodoQuery = "SELECT * FROM hrm_calendartodo WHERE id = ?";

      connection.query(checkTodoQuery, [todoId], (err, result) => {
        if (err) {
          console.error("Error Checking todo", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        if (result.length === 0) {
          // If the todoId does not exists, return an error
          return res.status(404).json({ error: "Invalid todoId" });
        }

        // If the todoId exists, proceed to save the event
        const { description, start, end } = req.body;

        const insertEventQuery =
          "INSERT INTO hrm_calendarevents (companyId, description, start, end, todoId, deleted) VALUES (?, ?, ?, ?, ?, ?)";

        connection.query(
          insertEventQuery,
          [req.user.companyId, description, start, end, todoId, false],
          (err, result) => {
            if (err) {
              console.error("Error creating Calendar Event", err);
              return res.status(500).json({ error: "Internal Server Error" });
            }

            res
              .status(200)
              .json({ message: "Calendar Event created successfully" });
          }
        );
      });
    } else {
      // User is not an admin and HR, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error Creating calendar event", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.updateCalendarEvent = async (req, res) => {
  try {
    // Check if the user making the request is an admin
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      const { description, start, end, todoId } = req.body;

      const eventId = req.params.id;

      // Update the calendar event in the database
      const updatedEventsQuery =
        "UPDATE hrm_calendarevents SET description = ?, start = ?, end = ?, todoId = ? WHERE id = ?";

      connection.query(
        updatedEventsQuery,
        [description, start, end, todoId, eventId],
        (err, results) => {
          if (err) {
            console.error("Error updating calendar event", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res.status(200).json({
            success: true,
            message: "Calendar Event updated successfully",
          });
        }
      );
    } else {
      // User is not an admin and HR, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error updating calendar event", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.deleteCalendarEvent = async (req, res) => {
  try {
    const calenderEventId = req.params.id;

    // Check if the user making the request is an admin
    if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
      // Update calendar event status to "Deleted" in the database
      const deleteEventsQuery =
        "UPDATE hrm_calendarevents SET deleted = true WHERE id = ?";

      connection.query(deleteEventsQuery, [calenderEventId], (err, result) => {
        if (err) {
          console.error("Error deleting calendar events", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({ message: "calendar events marked as deleted" });
      });
    } else {
      // User is not an admin and Hr, deny access
      res.status(403).json({ error: "Access Denied" });
    }
  } catch (error) {
    console.error("Error deleting calendar events", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.calendarEventList = async (req, res) => {
  try {
    const sql =
      "SELECT * FROM hrm_calendarevents WHERE deleted = false AND companyId = ?";

    connection.query(sql, [req.user.companyId], (err, results) => {
      if (err) {
        console.error("Error Fetching Calendar Events", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (results.length > 0) {
        res.status(200).json(results);
      } else {
        return res.status(404).json({ error: "No Calendar Event Found!" });
      }
    });
  } catch (error) {
    console.error("Error Listing Events", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
