const { Student, Enrollment, Subject } = require("../models");

exports.getAllStudents = async (req, res, next) => {
  try {
    const students = await Student.findAll({
      include: [
        {
          model: Enrollment,
          include: [Subject]
        }
      ],
      order: [["id", "ASC"]]
    });
    res.json(students);
  } catch (error) {
    next(error);
  }
};

exports.getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id, {
      include: [
        {
          model: Enrollment,
          include: [Subject]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    next(error);
  }
};

exports.createStudent = async (req, res, next) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await student.update(req.body);
    res.json(student);
  } catch (error) {
    next(error);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await student.destroy();
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    next(error);
  }
};
