const { Subject, Enrollment, Student } = require("../models");

exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.findAll({
      include: [
        {
          model: Enrollment,
          include: [Student]
        }
      ],
      order: [["id", "ASC"]]
    });
    res.json(subjects);
  } catch (error) {
    next(error);
  }
};

exports.getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findByPk(req.params.id, {
      include: [
        {
          model: Enrollment,
          include: [Student]
        }
      ]
    });

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json(subject);
  } catch (error) {
    next(error);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json(subject);
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await subject.update(req.body);
    res.json(subject);
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await subject.destroy();
    res.json({ message: "Subject deleted successfully" });
  } catch (error) {
    next(error);
  }
};
