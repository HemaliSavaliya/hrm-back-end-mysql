// new config code
const mysql = require("mysql");
const dotenv = require("dotenv");
dotenv.config();

const pool = mysql.createPool({
  connectionLimit: 10, // Adjust as needed
  host: "srv784.hstgr.io",
  user: "u441074635_hrm_stack_dash",
  password: "Czfiu/B7",
  database: "u441074635_hrm_stack_dash",
});

// To get a connection from the pool
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error getting a database connection:", err.stack);
    return;
  }

  // Use the connection
  console.log("Connected to database with connection ID:", connection.threadId);

  // When done, release the connection back to the pool
  connection.release();
});

module.exports = pool;
