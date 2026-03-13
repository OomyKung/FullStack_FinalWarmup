require("dotenv").config();

const express = require("express");
const path = require("path");
const axios = require("axios");
const methodOverride = require("method-override");

const app = express();
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.backendUrl = BACKEND_URL;
  next();
});

// Helper function to make API calls to backend
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BACKEND_URL}${endpoint}`,
      headers: { "Content-Type": "application/json" }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API Error calling ${endpoint}:`, error.message);
    throw error;
  }
}

// HOME PAGE
app.get("/", async (req, res, next) => {
  try {
    const stats = await apiCall("GET", "/api/stats");
    res.render("home", {
      pageTitle: "Dashboard",
      stats
    });
  } catch (error) {
    next(error);
  }
});

// STUDENTS PAGE
app.get("/students", async (req, res, next) => {
  try {
    const students = await apiCall("GET", "/api/students");
    res.render("students", {
      pageTitle: "Students",
      students,
      formMode: "create",
      editStudent: null
    });
  } catch (error) {
    next(error);
  }
});

app.post("/students", async (req, res, next) => {
  try {
    await apiCall("POST", "/api/students", req.body);
    res.redirect("/students");
  } catch (error) {
    next(error);
  }
});

app.get("/students/:id/edit", async (req, res, next) => {
  try {
    const [students, editStudent] = await Promise.all([
      apiCall("GET", "/api/students"),
      apiCall("GET", `/api/students/${req.params.id}`)
    ]);

    res.render("students", {
      pageTitle: "Students",
      students,
      formMode: "edit",
      editStudent
    });
  } catch (error) {
    next(error);
  }
});

app.put("/students/:id", async (req, res, next) => {
  try {
    await apiCall("PUT", `/api/students/${req.params.id}`, req.body);
    res.redirect("/students");
  } catch (error) {
    next(error);
  }
});

app.delete("/students/:id", async (req, res, next) => {
  try {
    await apiCall("DELETE", `/api/students/${req.params.id}`);
    res.redirect("/students");
  } catch (error) {
    next(error);
  }
});

// SUBJECTS PAGE
app.get("/subjects", async (req, res, next) => {
  try {
    const subjects = await apiCall("GET", "/api/subjects");
    res.render("subjects", {
      pageTitle: "Subjects",
      subjects,
      formMode: "create",
      editSubject: null
    });
  } catch (error) {
    next(error);
  }
});

app.post("/subjects", async (req, res, next) => {
  try {
    await apiCall("POST", "/api/subjects", req.body);
    res.redirect("/subjects");
  } catch (error) {
    next(error);
  }
});

app.get("/subjects/:id/edit", async (req, res, next) => {
  try {
    const [subjects, editSubject] = await Promise.all([
      apiCall("GET", "/api/subjects"),
      apiCall("GET", `/api/subjects/${req.params.id}`)
    ]);

    res.render("subjects", {
      pageTitle: "Subjects",
      subjects,
      formMode: "edit",
      editSubject
    });
  } catch (error) {
    next(error);
  }
});

app.put("/subjects/:id", async (req, res, next) => {
  try {
    await apiCall("PUT", `/api/subjects/${req.params.id}`, req.body);
    res.redirect("/subjects");
  } catch (error) {
    next(error);
  }
});

app.delete("/subjects/:id", async (req, res, next) => {
  try {
    await apiCall("DELETE", `/api/subjects/${req.params.id}`);
    res.redirect("/subjects");
  } catch (error) {
    next(error);
  }
});

// ENROLLMENTS PAGE
app.get("/enrollments", async (req, res, next) => {
  try {
    const [enrollments, students, subjects] = await Promise.all([
      apiCall("GET", "/api/enrollments"),
      apiCall("GET", "/api/students"),
      apiCall("GET", "/api/subjects")
    ]);

    res.render("enrollments", {
      pageTitle: "Enrollments",
      enrollments,
      students,
      subjects,
      formMode: "create",
      editEnrollment: null
    });
  } catch (error) {
    next(error);
  }
});

app.post("/enrollments", async (req, res, next) => {
  try {
    await apiCall("POST", "/api/enrollments", req.body);
    res.redirect("/enrollments");
  } catch (error) {
    next(error);
  }
});

app.get("/enrollments/:id/edit", async (req, res, next) => {
  try {
    const [enrollments, students, subjects, editEnrollment] = await Promise.all([
      apiCall("GET", "/api/enrollments"),
      apiCall("GET", "/api/students"),
      apiCall("GET", "/api/subjects"),
      apiCall("GET", `/api/enrollments/${req.params.id}`)
    ]);

    res.render("enrollments", {
      pageTitle: "Enrollments",
      enrollments,
      students,
      subjects,
      formMode: "edit",
      editEnrollment
    });
  } catch (error) {
    next(error);
  }
});

app.put("/enrollments/:id", async (req, res, next) => {
  try {
    await apiCall("PUT", `/api/enrollments/${req.params.id}`, req.body);
    res.redirect("/enrollments");
  } catch (error) {
    next(error);
  }
});

app.delete("/enrollments/:id", async (req, res, next) => {
  try {
    await apiCall("DELETE", `/api/enrollments/${req.params.id}`);
    res.redirect("/enrollments");
  } catch (error) {
    next(error);
  }
});

// REPORTS PAGE
app.get("/reports/enrollment-summary", async (req, res, next) => {
  try {
    const report = await apiCall("GET", "/api/reports/enrollment-summary");
    res.render("reports/enrollment-summary", {
      pageTitle: "Enrollment Report",
      report
    });
  } catch (error) {
    next(error);
  }
});

// Error handling
app.use((req, res) => {
  res.status(404).render("error", {
    pageTitle: "Not Found",
    error: "Page not found"
  });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).render("error", {
    pageTitle: "Error",
    error: err.message || "Unexpected error"
  });
});

app.listen(FRONTEND_PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎨 FRONTEND SERVER running on http://localhost:${FRONTEND_PORT}`);
  console.log(`🔗 Connected to Backend at: ${BACKEND_URL}`);
  console.log(`${"=".repeat(60)}\n`);
});
