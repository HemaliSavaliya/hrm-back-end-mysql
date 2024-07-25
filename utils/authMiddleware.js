const jwt = require('jsonwebtoken');
const connection = require('../config/config');

async function findUserById(id, role) {
    return new Promise((resolve, reject) => {
        let sql;
        if (role === "SuperAdmin") {
            sql = `SELECT * FROM hrm_superadmin WHERE id = ?`;
        } else if (role === 'Admin') {
            sql = `SELECT * FROM hrm_admins WHERE id = ?`;
        } else {
            sql = `SELECT * FROM hrm_employees WHERE id = ?`;
        }

        connection.query(sql, [id], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result[0]);
            }
        })
    })
}

module.exports.authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Token not provided" });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (!decodedToken) {
            return res.status(401).json({ error: "Invalid token" });
        }

        // Check the role and find the user accordingly
        let userData;
        if (decodedToken.role === "SuperAdmin") {
            userData = await findUserById(decodedToken.id, decodedToken.role);
        } else if (decodedToken.role === "Admin") {
            userData = await findUserById(decodedToken.id, decodedToken.role);
        } else {
            userData = await findUserById(decodedToken.id, decodedToken.role);
        }

        if (!userData) {
            return res.status(401).json({ error: "User not found" });
        }

        // Attach the user object to the request for further use
        req.user = userData;
        next();
    } catch (error) {
        console.error("Error during authentication", error);
        res.status(401).json({ error: "Invalid token" });
    }
}