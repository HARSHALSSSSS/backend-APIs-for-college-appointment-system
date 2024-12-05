const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',  // Save the database to a file named "database.sqlite"
  }); // In-memory SQLite database

// Define User Model
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('student', 'professor'), allowNull: false },
});

// Define Availability Model
const Availability = sequelize.define('Availability', {
  timeSlot: { type: DataTypes.STRING, allowNull: false },
});

// Define Appointment Model
const Appointment = sequelize.define('Appointment', {
  timeSlot: { type: DataTypes.STRING, allowNull: false },
});

// Relationships
// In the User model
User.hasMany(Availability);
Availability.belongsTo(User);


User.hasMany(Appointment, { as: 'StudentAppointments', foreignKey: 'studentId' });
User.hasMany(Appointment, { as: 'ProfessorAppointments', foreignKey: 'professorId' });
Appointment.belongsTo(User, { as: 'Student', foreignKey: 'studentId' });
Appointment.belongsTo(User, { as: 'Professor', foreignKey: 'professorId' });

module.exports = { sequelize, User, Availability, Appointment };
