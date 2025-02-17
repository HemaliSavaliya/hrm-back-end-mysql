const pool = require("../config/config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const sql = `
      SELECT id, name, email, password, NULL AS deleted, NULL AS companyId, 'SuperAdmin' AS role, 'superadmin' AS user_type FROM hrm_superadmin WHERE email = ?
      UNION ALL
      SELECT id, name, email, password, deleted, companyId, 'Admin' AS role, 'admin' AS user_type FROM hrm_admins WHERE email = ?
      UNION ALL
      SELECT id, name, email, password, deleted, companyId, role, 'employee' AS user_type FROM hrm_employees WHERE email = ?
    `;

    pool.query(sql, [email, email, email], async (err, results) => {
      if (err) {
        // console.error("Error during login:", err);
        return res.status(500).json({ error: "Internal Server Error" }, err);
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      let user = results[0]; // Assuming the user is unique across tables

      if (user.deleted) {
        return res.status(401).json({ error: "User Account is deleted" });
      }

      // Check if the password is correct
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).send({ error: "Invalid password" });
      }

      // Authenticate successfully, generate and return a token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "10h" }
      );

      res.status(200).json({
        data: {
          token,
          companyId: user.companyId,
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  } catch (error) {
    // console.error("Error during login", error);
    next(error);
    return res.status(500).json({ error: "Internal Server Error" }, error);
  }
};

module.exports.logout = async (req, res) => {
  try {
    res.status(200).json({ message: "Logout successfully" });
  } catch (error) {
    console.error("Error during logout", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.addSuperAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Insert the new user into the superadmin table
    const insertSql = `INSERT INTO hrm_superadmin (name, email, password, role) VALUES (?, ?, ?, ?)`;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    pool.query(
      insertSql,
      [name, email, hashedPassword, role || "SuperAdmin"],
      (err, result) => {
        if (err) {
          console.error("Error adding SuperAdmin:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        res
          .status(201)
          .json({ name, email, password, role: role || "SuperAdmin" });
      }
    );
  } catch (error) {
    console.error("Error adding SuperAdmin", error);
    return res.status(500).json({ error: "Internal Server Error" }, error);
  }
};
