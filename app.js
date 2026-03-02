require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const methodOverride = require("method-override");

const { sequelize, Student, Subject, Enrollment } = require("./models");
const studentRoutes = require("./routes/studentRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.use("/api/students", studentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/reports", reportRoutes);

async function getStudents() {
  return Student.findAll({
    include: [
      {
        model: Enrollment,
        include: [Subject]
      }
    ],
    order: [["id", "ASC"]]
  });
}

async function getSubjects() {
  return Subject.findAll({
    include: [
      {
        model: Enrollment,
        include: [Student]
      }
    ],
    order: [["id", "ASC"]]
  });
}

async function getEnrollments() {
  return Enrollment.findAll({
    include: [Student, Subject],
    order: [["id", "ASC"]]
  });
}

async function getEnrollmentSummary() {
  const subjects = await Subject.findAll({
    include: [
      {
        model: Enrollment,
        include: [Student]
      }
    ],
    order: [["title", "ASC"]]
  });

  return subjects.map((subject) => {
    const grades = subject.Enrollments.map((enrollment) => enrollment.grade);

    return {
      subjectId: subject.id,
      subjectCode: subject.subjectCode,
      title: subject.title,
      credits: subject.credits,
      enrollmentCount: subject.Enrollments.length,
      passedCount: grades.filter((grade) => grade !== "F").length,
      failedCount: grades.filter((grade) => grade === "F").length,
      students: subject.Enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        semester: enrollment.semester,
        grade: enrollment.grade,
        studentName: enrollment.Student.fullName,
        studentCode: enrollment.Student.studentCode
      }))
    };
  });
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

app.get("/", async (req, res, next) => {
  try {
    const [students, subjects, enrollments, report] = await Promise.all([
      getStudents(),
      getSubjects(),
      getEnrollments(),
      getEnrollmentSummary()
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
    res.render("students", {
      pageTitle: "Students",
      students: await getStudents(),
      formMode: "create",
      editStudent: null
    });
  } catch (error) {
    next(error);
  }
});

app.post("/students", async (req, res, next) => {
  try {
    await Student.create(req.body);
    res.redirect("/students");
  } catch (error) {
    next(error);
  }
});

app.get("/students/:id/edit", async (req, res, next) => {
  try {
    const [students, editStudent] = await Promise.all([
      getStudents(),
      Student.findByPk(req.params.id)
    ]);

    if (!editStudent) {
      throw createHttpError(404, "Student not found");
    }

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
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      throw createHttpError(404, "Student not found");
    }

    await student.update(req.body);
    res.redirect("/students");
  } catch (error) {
    next(error);
  }
});

app.delete("/students/:id", async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      throw createHttpError(404, "Student not found");
    }

    await student.destroy();
    res.redirect("/students");
  } catch (error) {
    next(error);
  }
});

app.get("/subjects", async (req, res, next) => {
  try {
    res.render("subjects", {
      pageTitle: "Subjects",
      subjects: await getSubjects(),
      formMode: "create",
      editSubject: null
    });
  } catch (error) {
    next(error);
  }
});

app.post("/subjects", async (req, res, next) => {
  try {
    await Subject.create({
      ...req.body,
      credits: Number(req.body.credits)
    });
    res.redirect("/subjects");
  } catch (error) {
    next(error);
  }
});

app.get("/subjects/:id/edit", async (req, res, next) => {
  try {
    const [subjects, editSubject] = await Promise.all([
      getSubjects(),
      Subject.findByPk(req.params.id)
    ]);

    if (!editSubject) {
      throw createHttpError(404, "Subject not found");
    }

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
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) {
      throw createHttpError(404, "Subject not found");
    }

    await subject.update({
      ...req.body,
      credits: Number(req.body.credits)
    });
    res.redirect("/subjects");
  } catch (error) {
    next(error);
  }
});

app.delete("/subjects/:id", async (req, res, next) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) {
      throw createHttpError(404, "Subject not found");
    }

    await subject.destroy();
    res.redirect("/subjects");
  } catch (error) {
    next(error);
  }
});

app.get("/enrollments", async (req, res, next) => {
  try {
    const [enrollments, students, subjects] = await Promise.all([
      getEnrollments(),
      Student.findAll({ order: [["id", "ASC"]] }),
      Subject.findAll({ order: [["id", "ASC"]] })
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
    const studentId = Number(req.body.studentId);
    const subjectId = Number(req.body.subjectId);
    const [student, subject] = await Promise.all([
      Student.findByPk(studentId),
      Subject.findByPk(subjectId)
    ]);

    if (!student || !subject) {
      throw createHttpError(400, "Student and subject must exist before creating an enrollment");
    }

    await Enrollment.create({
      ...req.body,
      studentId,
      subjectId
    });
    res.redirect("/enrollments");
  } catch (error) {
    next(error);
  }
});

app.get("/enrollments/:id/edit", async (req, res, next) => {
  try {
    const enrollmentId = req.params.id;
    const [enrollments, students, subjects, editEnrollment] = await Promise.all([
      getEnrollments(),
      Student.findAll({ order: [["id", "ASC"]] }),
      Subject.findAll({ order: [["id", "ASC"]] }),
      Enrollment.findByPk(enrollmentId, { include: [Student, Subject] })
    ]);

    if (!editEnrollment) {
      throw createHttpError(404, "Enrollment not found");
    }

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
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) {
      throw createHttpError(404, "Enrollment not found");
    }

    const studentId = Number(req.body.studentId);
    const subjectId = Number(req.body.subjectId);
    const [student, subject] = await Promise.all([
      Student.findByPk(studentId),
      Subject.findByPk(subjectId)
    ]);

    if (!student || !subject) {
      throw createHttpError(400, "Student and subject must exist before updating an enrollment");
    }

    await enrollment.update({
      ...req.body,
      studentId,
      subjectId
    });
    res.redirect("/enrollments");
  } catch (error) {
    next(error);
  }
});

app.delete("/enrollments/:id", async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) {
      throw createHttpError(404, "Enrollment not found");
    }

    await enrollment.destroy();
    res.redirect("/enrollments");
  } catch (error) {
    next(error);
  }
});

app.get("/reports/enrollment-summary", async (req, res, next) => {
  try {
    res.render("reports/enrollment-summary", {
      pageTitle: "Enrollment Report",
      report: await getEnrollmentSummary()
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).render("error", {
    pageTitle: "Not Found",
    error: "Page not found"
  });
});

app.use((err, req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(err.status || 500).json({
      message: err.message || "Internal server error"
    });
  }

  res.status(err.status || 500).render("error", {
    pageTitle: "Error",
    error: err.message || "Unexpected error"
  });
});

sequelize
  .sync()
  .then(() => {
    app.listen(port, () => {
      console.log(`App running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start app:", error);
  });
