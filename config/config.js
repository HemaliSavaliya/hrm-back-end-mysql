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

// Database connection configuration
const connection = mysql.createConnection({
  connectionLimit: 100,
  host: "srv784.hstgr.io",
  user: "u441074635_hrm_stack_dash",
  password: "Czfiu/B7",
  database: "u441074635_hrm_stack_dash",
});

// Connect to MySQL database
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to database: " + err.stack);
    return;
  }
  console.log("Connected to database");
});

module.exports = connection;
