// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const connection = require("../config/config");

const pool = require("../config/config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports.login = async (req, res) => {
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
        console.error("Error during login:", err);
        return res.status(500).json({ error: "Internal Server Error" });
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
        process.env.JWT_SECRET_KEY
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
    console.error("Error during login", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// module.exports.login = async (req, res) => {
//     try {
//         const { email, password, role } = req.body;

//         // Find user by email in super admin table
//         const superadminSql = `SELECT * FROM superadmin WHERE email = ?`;

//         connection.query(superadminSql, [email], async (err, adminResult) => {
//             if (err) {
//                 console.error("Error during login:", err);
//                 return res.status(500).json({ error: "Internal Server Error" });
//             }

//             // Find user by email in admin table
//             const adminSql = `SELECT * FROM admin WHERE email = ?`;

//             connection.query(adminSql, [email], async (err, userResults) => {
//                 if (err) {
//                     console.error("Error during login:", err);
//                     return res.status(500).json({ error: "Internal Server Error" });
//                 }

//                 // Find user by email in employees table
//                 const employeeSql = `SELECT * FROM employee WHERE email = ?`;

//                 connection.query(employeeSql, [email], async (err, employeeResults) => {
//                     if (err) {
//                         console.error("Error during login:", err);
//                         return res.status(500).json({ error: "Internal Server Error" });
//                     }

//                     // Check if user exists and is not deleted
//                     let user = null;
//                     if (adminResult.length > 0) {
//                         user = adminResult[0];
//                     } else if (userResults.length > 0) {
//                         user = userResults[0];
//                     } else if (employeeResults.length > 0) {
//                         user = employeeResults[0];
//                     }

//                     if (user) {
//                         if (user.deleted) {
//                             return res.status(401).json({ error: "User Account is deleted" });
//                         }

//                         // Check if the password is correct
//                         const passwordMatch = await bcrypt.compare(password, user.password);
//                         if (!passwordMatch) {
//                             return res.status(401).send({ error: "Invalid password" });
//                         }

//                         // Check the user's role matches the specified role in the request
//                         if (role && user.role !== role) {
//                             return res.status(403).send({ error: "Access denied" });
//                         }

//                         // Authenticate successfully, generate and return a token
//                         const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET_KEY);

//                         res.status(200).json({ data: { token, companyId: user.companyId, id: user.id, name: user.name, email: user.email, role: user.role } });
//                     } else {
//                         // User not found in both tables
//                         return res.status(404).json({ error: "User not found" });
//                     }
//                 });
//             });
//         });
//     } catch (error) {
//         console.error("Error durning login", error);
//         return res.status(500).json({ error: "Internal Server Error" });
//     }
// }

// module.exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Query all tables to find user by email
//     const sql = `
//             SELECT id, name, email, password, NULL AS deleted, NULL AS companyId, 'SuperAdmin' AS role, 'superadmin' AS user_type FROM hrm_superadmin WHERE email = ?
//             UNION ALL
//             SELECT id, name, email, password, deleted, companyId, 'Admin' AS role, 'admin' AS user_type FROM hrm_admins WHERE email = ?
//             UNION ALL
//             SELECT id, name, email, password, deleted, companyId, role, 'employee' AS user_type FROM hrm_employees WHERE email = ?
//         `;

//     connection.query(sql, [email, email, email], async (err, results) => {
//       if (err) {
//         console.error("Error during login:", err);
//         return res.status(500).json({ error: "Internal Server Error" });
//       }

//       if (results.length === 0) {
//         return res.status(404).json({ error: "User not found" });
//       }

//       let user = null;
//       if (results.length > 0) {
//         user = results[0]; // Assuming the user is unique across tables
//       }

//       if (user.deleted) {
//         return res.status(401).json({ error: "User Account is deleted" });
//       }

//       // Check if the password is correct
//       const passwordMatch = await bcrypt.compare(password, user.password);
//       if (!passwordMatch) {
//         return res.status(401).send({ error: "Invalid password" });
//       }

//       // Authenticate successfully, generate and return a token
//       const token = jwt.sign(
//         { id: user.id, role: user.role },
//         process.env.JWT_SECRET_KEY
//       );

//       res.status(200).json({
//         data: {
//           token,
//           companyId: user.companyId,
//           id: user.id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//         },
//       });
//     });
//   } catch (error) {
//     console.error("Error during login", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

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

    connection.query(
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
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
