// const mysql = require("mysql");
// const dotenv = require("dotenv");
// dotenv.config();

// // Database connection configuration
// const connection = mysql.createConnection({
//   connectionLimit: 100,
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "hrm",
// });

// // Connect to MySQL database
// connection.connect((err) => {
//   if (err) {
//     console.error("Error connecting to database: " + err.stack);
//     return;
//   }
//   console.log("Connected to database");
// });

// module.exports = connection;

// // For live server
// const mysql = require("mysql");
// const dotenv = require("dotenv");
// dotenv.config();

// const dbConfig = {
//     host: process.env.DATABASE_HOST,
//     user: process.env.DATABASE_USER,
//     password: process.env.DATABASE_PASSWORD,
//     database: process.env.DATABASE_NAME
// };

// let connection;

// function handleDisconnect() {
//     connection = mysql.createConnection(dbConfig);

//     connection.connect((err) => {
//         if (err) {
//             console.error("Error connecting to database: ", err.stack);
//             setTimeout(handleDisconnect, 2000); // Reconnect after 2 seconds
//         } else {
//             console.log("Connected to database");
//         }
//     });

//     connection.on('error', (err) => {
//         console.error("Database error", err);
//         if (err.code === "PROTOCOL_CONNECTION_LOST") {
//             handleDisconnect();
//         } else {
//             throw err;
//         }
//     });
// }

// handleDisconnect();

// module.exports = connection;

// For live with the use of pool
const mysql = require("mysql");
const dotenv = require("dotenv");
dotenv.config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

pool.on("connection", (connection) => {
  console.log("Connected to database", connection);
});

pool.on("error", (err) => {
  console.error("Database error", err);
});

module.exports = pool;

// // For live with the use of pool
// const mysql = require("mysql");
// const dotenv = require("dotenv");
// dotenv.config();

// const poolConfig = {
//   connectionLimit: 10,
//   host: process.env.DATABASE_HOST,
//   user: process.env.DATABASE_USER,
//   password: process.env.DATABASE_PASSWORD,
//   database: process.env.DATABASE_NAME,
//   port: process.env.DATABASE_PORT || 3306,
// };

// // Optional SSL configuration if required by your database
// if (process.env.DATABASE_SSL === "true") {
//   poolConfig.ssl = {
//     rejectUnauthorized: true,
//   };
// }

// const pool = mysql.createPool(poolConfig);

// pool.on("connection", (connection) => {
//   console.log("Connected to database with ID:", connection.threadId);
// });

// pool.on("error", (err) => {
//   console.error("Database error", err.code, err.message);
// });

// pool.getConnection((err, connection) => {
//   if (err) {
//     switch (err.code) {
//       case "PROTOCOL_CONNECTION_LOST":
//         console.error("Database connection was closed.");
//         break;
//       case "ER_CON_COUNT_ERROR":
//         console.error("Database has too many connections.");
//         break;
//       case "ECONNREFUSED":
//         console.error("Database connection was refused.");
//         break;
//       default:
//         console.error("Database connection error:", err.code, err.message);
//     }
//   }

//   if (connection) connection.release();
// });

// module.exports = pool;
