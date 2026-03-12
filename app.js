require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { sequelize, Student, Subject, Enrollment } = require("./models");
const studentRoutes = require("./routes/studentRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const BACKEND_PORT = process.env.BACKEND_PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3001" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/students", studentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/reports", reportRoutes);

// Helper: Get statistics
async function getStats() {
  const students = await Student.findAll();
  const subjects = await Subject.findAll();
  const enrollments = await Enrollment.findAll();
  
  return {
    students: students.length,
    subjects: subjects.length,
    enrollments: enrollments.length,
    reports: subjects.length
  };
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend API is running" });
});

// STATISTICS ENDPOINT
app.get("/api/stats", async (req, res, next) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET single student endpoint (for edit page)
app.get("/api/students/:id", async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      throw createHttpError(404, "Student not found");
    }
    res.json(student);
  } catch (error) {
    next(error);
  }
});

// GET single subject endpoint (for edit page)
app.get("/api/subjects/:id", async (req, res, next) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) {
      throw createHttpError(404, "Subject not found");
    }
    res.json(subject);
  } catch (error) {
    next(error);
  }
});

// GET single enrollment endpoint (for edit page)
app.get("/api/enrollments/:id", async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [Student, Subject]
    });
    if (!enrollment) {
      throw createHttpError(404, "Enrollment not found");
    }
    res.json(enrollment);
  } catch (error) {
    next(error);
  }
});

// Error handling for API
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

sequelize
  .sync()
  .then(() => {
    app.listen(BACKEND_PORT, () => {
      console.log("\n" + "=".repeat(60));
      console.log(`🔧 BACKEND API SERVER running on http://localhost:${BACKEND_PORT}`);
      console.log(`📡 API Base URL: http://localhost:${BACKEND_PORT}/api`);
      console.log(`🔗 Frontend connects to: http://localhost:${BACKEND_PORT}`);
      console.log("=".repeat(60) + "\n");
    });
  })
  .catch((error) => {
    console.error("Failed to start app:", error);
  });
