const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const connection = require("../config/config"); // Adjust the path if needed

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const userQuery = `SELECT email FROM hrm_superadmin WHERE email = ?
    `;

  connection.query(userQuery, [email], (err, userResults) => {
    if (err) {
      console.error("Error querying user:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const insertTokenQuery = `
        INSERT INTO hrm_password_reset (email, token)
        VALUES (?, ?)
      `;

    connection.query(insertTokenQuery, [email, token], (insertErr) => {
      if (insertErr) {
        console.error("Error inserting token:", insertErr);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      const resetLink = `http://localhost:3000/reset-password?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset",
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password</p>`,
      };

      transporter.sendMail(mailOptions, (mailErr) => {
        if (mailErr) {
          console.error("Error sending email:", mailErr);
          return res.status(500).json({ message: "Error sending email" });
        }

        res.status(200).json({ message: "Password reset link sent" });
      });
    });
  });
};

module.exports.resetPassword = (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ message: "Token and passwords are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const tokenQuery = `SELECT email FROM hrm_password_reset WHERE token = ?`;

  connection.query(tokenQuery, [token], (err, rows) => {
    if (err) {
      console.error("Error querying token:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const email = rows[0].email;

    bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error("Error hashing password:", hashErr);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      // Update password in hrm_superadmin
      const updateSuperAdminPasswordQuery = `UPDATE hrm_superadmin SET password = ? WHERE email = ?`;

      connection.query(
        updateSuperAdminPasswordQuery,
        [hashedPassword, email],
        (updateSuperAdminErr) => {
          if (updateSuperAdminErr) {
            console.error(
              "Error updating superadmin password:",
              updateSuperAdminErr
            );
            return res.status(500).json({ message: "Internal Server Error" });
          }

          // Delete the token after use
          const deleteTokenQuery = `DELETE FROM hrm_password_reset WHERE token = ?`;

          connection.query(deleteTokenQuery, [token], (deleteErr) => {
            if (deleteErr) {
              console.error("Error deleting token:", deleteErr);
              return res.status(500).json({ message: "Internal Server Error" });
            }

            res.status(200).json({ message: "Password reset successful" });
          });
        }
      );
    });
  });
};
