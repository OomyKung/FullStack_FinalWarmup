const { Enrollment, Student, Subject } = require("../models");

exports.getAllEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.findAll({
      include: [Student, Subject],
      order: [["id", "ASC"]]
    });
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

exports.getEnrollmentById = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [Student, Subject]
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    res.json(enrollment);
  } catch (error) {
    next(error);
  }
};

exports.createEnrollment = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.body.studentId);
    const subject = await Subject.findByPk(req.body.subjectId);

    if (!student || !subject) {
      return res.status(400).json({
        message: "Student and subject must exist before creating an enrollment"
      });
    }

    const enrollment = await Enrollment.create(req.body);
    const createdEnrollment = await Enrollment.findByPk(enrollment.id, {
      include: [Student, Subject]
    });

    res.status(201).json(createdEnrollment);
  } catch (error) {
    next(error);
  }
};

exports.updateEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    const student = await Student.findByPk(req.body.studentId);
    const subject = await Subject.findByPk(req.body.subjectId);

    if (!student || !subject) {
      return res.status(400).json({
        message: "Student and subject must exist before updating an enrollment"
      });
    }

    await enrollment.update(req.body);
    const updatedEnrollment = await Enrollment.findByPk(enrollment.id, {
      include: [Student, Subject]
    });

    res.json(updatedEnrollment);
  } catch (error) {
    next(error);
  }
};

exports.deleteEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    await enrollment.destroy();
    res.json({ message: "Enrollment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
