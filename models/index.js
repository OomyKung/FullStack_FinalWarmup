require("dotenv").config();

const { Sequelize, DataTypes } = require("sequelize");

const StudentModel = require("./Student");
const SubjectModel = require("./Subject");
const EnrollmentModel = require("./Enrollment");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: process.env.DB_PATH || "./database/database.sqlite",
  logging: false
});

const Student = StudentModel(sequelize, DataTypes);
const Subject = SubjectModel(sequelize, DataTypes);
const Enrollment = EnrollmentModel(sequelize, DataTypes);

Student.hasMany(Enrollment, {
  foreignKey: "studentId",
  onDelete: "CASCADE"
});
Enrollment.belongsTo(Student, {
  foreignKey: "studentId"
});

Subject.hasMany(Enrollment, {
  foreignKey: "subjectId",
  onDelete: "CASCADE"
});
Enrollment.belongsTo(Subject, {
  foreignKey: "subjectId"
});

module.exports = {
  sequelize,
  Student,
  Subject,
  Enrollment
};
