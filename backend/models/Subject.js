module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Subject", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    subjectCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    credits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    }
  });
};
