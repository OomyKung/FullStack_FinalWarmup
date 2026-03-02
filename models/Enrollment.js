module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Enrollment", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    grade: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["A", "B+", "B", "C+", "C", "D+", "D", "F"]]
      }
    }
  });
};
