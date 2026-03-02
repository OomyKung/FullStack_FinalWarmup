require("dotenv").config();

const express = require("express");
const path = require("path");
const methodOverride = require("method-override");

const app = express();
const port = process.env.PORT || 3001;
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000/api";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

async function apiRequest(pathname, options = {}) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const errorPayload = await response.json();
      message = errorPayload.message || message;
    } catch (error) {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

app.get("/", async (req, res, next) => {
  try {
    const [students, subjects, enrollments, report] = await Promise.all([
      apiRequest("/students"),
      apiRequest("/subjects"),
      apiRequest("/enrollments"),
      apiRequest("/reports/enrollment-summary")
    ]);

    res.render("home", {
      pageTitle: "Dashboard",
      stats: {
        students: students.length,
        subjects: subjects.length,
        enrollments: enrollments.length,
        reports: report.length
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/students", async (req, res, next) => {
  try {
    const students = await apiRequest("/students");
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
    await apiRequest("/students", {
      method: "POST",
      body: JSON.stringify(req.body)
    });
    res.redirect("/students");
  } catch (error) {
    next(error);
  }
});

app.get("/students/:id/edit", async (req, res, next) => {
  try {
    const [students, editStudent] = await Promise.all([
      apiRequest("/students"),
      apiRequest(`/students/${req.params.id}`)
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
    await apiRequest(`/students/${req.params.id}`, {
      method: "PUT",
      body: JSON.stringify(req.body)
    });
    res.redirect("/students");
  } catch (error) {
    next(error);
  }
});

app.delete("/students/:id", async (req, res, next) => {
  try {
    await apiRequest(`/students/${req.params.id}`, {
      method: "DELETE"
    });
    res.redirect("/students");
  } catch (error) {
    next(error);
  }
});

app.get("/subjects", async (req, res, next) => {
  try {
    const subjects = await apiRequest("/subjects");
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
    await apiRequest("/subjects", {
      method: "POST",
      body: JSON.stringify({
        ...req.body,
        credits: Number(req.body.credits)
      })
    });
    res.redirect("/subjects");
  } catch (error) {
    next(error);
  }
});

app.get("/subjects/:id/edit", async (req, res, next) => {
  try {
    const [subjects, editSubject] = await Promise.all([
      apiRequest("/subjects"),
      apiRequest(`/subjects/${req.params.id}`)
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
    await apiRequest(`/subjects/${req.params.id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...req.body,
        credits: Number(req.body.credits)
      })
    });
    res.redirect("/subjects");
  } catch (error) {
    next(error);
  }
});

app.delete("/subjects/:id", async (req, res, next) => {
  try {
    await apiRequest(`/subjects/${req.params.id}`, {
      method: "DELETE"
    });
    res.redirect("/subjects");
  } catch (error) {
    next(error);
  }
});

app.get("/enrollments", async (req, res, next) => {
  try {
    const [enrollments, students, subjects] = await Promise.all([
      apiRequest("/enrollments"),
      apiRequest("/students"),
      apiRequest("/subjects")
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
    await apiRequest("/enrollments", {
      method: "POST",
      body: JSON.stringify({
        ...req.body,
        studentId: Number(req.body.studentId),
        subjectId: Number(req.body.subjectId)
      })
    });
    res.redirect("/enrollments");
  } catch (error) {
    next(error);
  }
});

app.get("/enrollments/:id/edit", async (req, res, next) => {
  try {
    const [enrollments, students, subjects, editEnrollment] = await Promise.all([
      apiRequest("/enrollments"),
      apiRequest("/students"),
      apiRequest("/subjects"),
      apiRequest(`/enrollments/${req.params.id}`)
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
    await apiRequest(`/enrollments/${req.params.id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...req.body,
        studentId: Number(req.body.studentId),
        subjectId: Number(req.body.subjectId)
      })
    });
    res.redirect("/enrollments");
  } catch (error) {
    next(error);
  }
});

app.delete("/enrollments/:id", async (req, res, next) => {
  try {
    await apiRequest(`/enrollments/${req.params.id}`, {
      method: "DELETE"
    });
    res.redirect("/enrollments");
  } catch (error) {
    next(error);
  }
});

app.get("/reports/enrollment-summary", async (req, res, next) => {
  try {
    const report = await apiRequest("/reports/enrollment-summary");
    res.render("reports/enrollment-summary", {
      pageTitle: "Enrollment Report",
      report
    });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  res.status(500).render("error", {
    pageTitle: "Error",
    error: err.message || "Unexpected error"
  });
});

app.listen(port, () => {
  console.log(`Frontend running on http://localhost:${port}`);
});
