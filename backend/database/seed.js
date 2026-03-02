require("dotenv").config();

const { sequelize, Student, Subject, Enrollment } = require("../models");

async function seed() {
  await sequelize.sync({ force: true });

  const students = await Student.bulkCreate([
    {
      studentCode: "ST001",
      fullName: "Anan Wong",
      major: "Computer Science"
    },
    {
      studentCode: "ST002",
      fullName: "Mali Suda",
      major: "Information Technology"
    },
    {
      studentCode: "ST003",
      fullName: "Pimchanok Dee",
      major: "Software Engineering"
    }
  ]);

  const subjects = await Subject.bulkCreate([
    {
      subjectCode: "CS101",
      title: "Database Systems",
      credits: 3
    },
    {
      subjectCode: "CS102",
      title: "Web Development",
      credits: 3
    },
    {
      subjectCode: "CS103",
      title: "System Analysis",
      credits: 2
    }
  ]);

  await Enrollment.bulkCreate([
    {
      studentId: students[0].id,
      subjectId: subjects[0].id,
      semester: "1/2026",
      grade: "A"
    },
    {
      studentId: students[0].id,
      subjectId: subjects[1].id,
      semester: "1/2026",
      grade: "B+"
    },
    {
      studentId: students[1].id,
      subjectId: subjects[0].id,
      semester: "1/2026",
      grade: "C+"
    },
    {
      studentId: students[1].id,
      subjectId: subjects[2].id,
      semester: "1/2026",
      grade: "A"
    },
    {
      studentId: students[2].id,
      subjectId: subjects[1].id,
      semester: "1/2026",
      grade: "F"
    }
  ]);

  console.log("Database seeded successfully");
  await sequelize.close();
}

seed().catch(async (error) => {
  console.error("Failed to seed database:", error);
  await sequelize.close();
  process.exit(1);
});
