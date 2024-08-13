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
