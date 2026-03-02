require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { sequelize } = require("./models");
const studentRoutes = require("./routes/studentRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    message: "School Enrollment API",
    endpoints: [
      "/api/students",
      "/api/subjects",
      "/api/enrollments",
      "/api/reports/enrollment-summary"
    ]
  });
});

app.use("/api/students", studentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/reports", reportRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

sequelize
  .sync()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start backend:", error);
  });
