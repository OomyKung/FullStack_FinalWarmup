const { Subject, Enrollment, Student } = require("../models");

exports.getEnrollmentSummary = async (req, res, next) => {
  try {
    const subjects = await Subject.findAll({
      include: [
        {
          model: Enrollment,
          include: [Student]
        }
      ],
      order: [["title", "ASC"]]
    });

    const report = subjects.map((subject) => {
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

    res.json(report);
  } catch (error) {
    next(error);
  }
};
