const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("./config/config.js");
const authRouter = require("./routes/authRoute");
const empRouter = require("./routes/userRouter");
const projectsRouter = require("./routes/projectsRoute");
const timerRouter = require("./routes/timerRoute");
const leaveTypeRouter = require("./routes/leaveTypeRoute");
const leaveRequestRouter = require("./routes/leaveRequestRoute");
const departmentRouter = require("./routes/departmentRoute");
const designationRouter = require("./routes/designationRoute");
const jobsRouter = require("./routes/jobsRoute");
const applicantRouter = require("./routes/applicantListRoute");
const calendarTodoRouter = require("./routes/calendarTodoRoute");
const calendarEventRouter = require("./routes/calendarEventRoute");
const announcementRouter = require("./routes/announcementRoute");
const awardsRouter = require("./routes/awardsRouter");
const profileRouter = require("./routes/profileRoute");
const companyRouter = require("./routes/companyRoute");
const adminRouter = require("./routes/adminRoute");
const roleRouter = require("./routes/roleRoute");
const permissionRouter = require("./routes/permissionRoute");
const passwordRouter = require("./routes/forgotPasswordRoute");
const holidayRoute = require("./routes/holidayRoute");
const expiringRoute = require("./routes/reminderRoute");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

const PORT = process.env.PORT || 9000;

app.get("/", (req, res) => {
  res.status(200).send("Welcome to Home page!");
});

app.use("/api", authRouter);
app.use("/api", empRouter);
app.use("/api", projectsRouter);
app.use("/api", timerRouter);
app.use("/api", leaveTypeRouter);
app.use("/api", leaveRequestRouter);
app.use("/api", departmentRouter);
app.use("/api", designationRouter);
app.use("/api", jobsRouter);
app.use("/api", applicantRouter);
app.use("/api", calendarTodoRouter);
app.use("/api", calendarEventRouter);
app.use("/api", announcementRouter);
app.use("/api", awardsRouter);
app.use("/api", profileRouter);
app.use("/api", companyRouter);
app.use("/api", adminRouter);
app.use("/api", roleRouter);
app.use("/api", permissionRouter);
app.use("/api", passwordRouter);
app.use("/api", holidayRoute);
app.use("/api", expiringRoute);

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

// # HRM-node-backend-goDaddy instance name  hrm-node-EP
