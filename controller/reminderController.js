const connection = require("../config/config");

module.exports.expiringSubscriptions = async (req, res) => {
  try {
    const today = new Date();

    // Query to join hrm_companys and hrm_admins on adminId or relevant foreign key
    const query = `
      SELECT hrm_admins.id AS adminId, hrm_admins.name, hrm_admins.email,
            hrm_companys.companyName, hrm_companys.endDate AS subscriptionEndDate
      FROM hrm_companys
      JOIN hrm_admins ON hrm_admins.companyId = hrm_companys.id
      WHERE hrm_companys.endDate > ?
    `;

    // Execute the query with today as parameters
    connection.query(query, [today], (error, results) => {
      if (error) {
        console.error("Error fetching expiring subscriptions:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // For each expiring subscription, store a notification if it doesn't exist
      results.forEach((admin) => {
        const subscriptionEndDate = new Date(admin.subscriptionEndDate);
        const timeDiff = subscriptionEndDate - today;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert ms to days

        // Only send notifications when daysLeft is 7 or 1
        if (daysLeft === 7 || daysLeft === 1) {
          const checkNotificationQuery = `SELECT * FROM hrm_notifications WHERE adminId = ? AND DATE(sentAt) = CURDATE() AND companyName = ?`;

          connection.query(
            checkNotificationQuery,
            [admin.adminId, admin.companyName],
            (error, notificationResult) => {
              if (error) {
                return res.status(500).json({ error: "Internal Server Error" });
              }

              // If no notification was sent today, insert a new one
              if (notificationResult.length === 0) {
                const insertNotificationQuery = `INSERT INTO hrm_notifications (adminId, message, companyName, deleted) VALUES (?, ?, ?, ?)`;

                const message = `${admin.name}'s subscription is expiring on ${admin.subscriptionEndDate}`;

                connection.query(
                  insertNotificationQuery,
                  [admin.adminId, message, admin.companyName, false],
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
        }
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

module.exports.deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const deletedQuery =
      "UPDATE hrm_notifications SET deleted = true, updatedAt = Now() WHERE id = ?";

    connection.query(deletedQuery, [notificationId], (err, result) => {
      if (err) {
        console.error("Error deleting notification:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      res.status(200).json({ message: "Notification marked as deleted" });
    });
  } catch (error) {
    console.error("Error delete notification:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
