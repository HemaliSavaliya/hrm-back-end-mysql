const connection = require("../config/config");

module.exports.expiringSubscriptions = async (req, res) => {
  try {
    const today = new Date();
    const reminderDate = new Date();
    reminderDate.setDate(today.getDate() + 7); // Notify 7 days before subscription ends

    // Query to join hrm_companys and hrm_admins on adminId or relevant foreign key
    const query = `
    SELECT hrm_admins.id AS adminId, hrm_admins.name, hrm_admins.email,
           hrm_companys.companyName, hrm_companys.endDate AS subscriptionEndDate
    FROM hrm_companys
    JOIN hrm_admins ON hrm_admins.companyId = hrm_companys.id
    WHERE hrm_companys.endDate BETWEEN ? AND ?
  `;

    // Execute the query with today and reminderDate as parameters
    connection.query(query, [today, reminderDate], (error, results) => {
      console.log("res", results);

      if (error) {
        console.error("Error fetching expiring:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // For each expiring subscription, store a notification if it doesn't exist
      results.forEach((admin) => {
        const checkNotificationQuery = `SELECT * FROM hrm_notifications WHERE adminId = ? AND DATE(sentAt) = CURDATE()`;

        connection.query(
          checkNotificationQuery,
          [admin.adminId],
          (error, notificationResult) => {
            if (error) {
              return res.status(500).json({ error: "Internal Server Error" });
            }

            // If no notification was sent today, insert a new one
            if (notificationResult.length === 0) {
              const insertNotificationQuery = `INSERT INTO hrm_notifications (adminId, message) VALUES (?, ?)`;

              const message = `${admin.name}'s subscription is expiring on ${admin.subscriptionEndDate}`;

              connection.query(
                insertNotificationQuery,
                [admin.adminId, message],
                (error) => {
                  if (error) {
                    return res
                      .status(500)
                      .json({ error: "Failed to store notification" });
                  }
                }
              );
            }
          }
        );
      });

      res.json(results); // Send the expiring subscriptions with admin details to the frontend
    });
  } catch (error) {
    console.error("Error getting expiring:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.getNotification = async (req, res) => {
  try {
    const query = `SELECT * FROM hrm_notifications ORDER BY sentAt DESC`;

    connection.query(query, (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ error: "Failed to retrieve notifications" });
      }

      res.json(results);
    });
  } catch (error) {
    console.error("Error notification result:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
