const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sequelize, User, Availability, Appointment } = require('./models');

const app = express();
app.use(express.json());

const SECRET_KEY = 'secret123'; // For JWT signing

// Middleware for JWT authentication
const authenticate = (roles) => async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;

    if (!req.user.id) {
      return res.status(400).send('Invalid token: Missing user ID');
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).send('Forbidden: Insufficient permissions');
    }

    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).send('Invalid token');
  }
};

// User Registration (Sign-Up) Route
app.post('/auth/register', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      username,
      password: hashedPassword,
      role,
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Error registering user', error: err });
  }
});

// User Authentication (Login) Route
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ where: { username } });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY);
      res.json({ token });
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Internal server error');
  }
});

// Professor specifies availability
app.post('/professors/availability', authenticate(['professor']), async (req, res) => {
  try {
    const { timeSlots } = req.body;
    if (!timeSlots || timeSlots.length === 0) {
      return res.status(400).send('Invalid time slots');
    }

    await Availability.bulkCreate(
      timeSlots.map((slot) => ({ timeSlot: slot, UserId: req.user.id }))
    );

    res.send('Availability added');
  } catch (err) {
    console.error('Error adding availability:', err);
    res.status(500).send('Internal server error');
  }
});

// Students view available slots
app.get('/students/professors/:id/availability', authenticate(['student']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).send('Professor ID is required');
    }

    const slots = await Availability.findAll({ where: { UserId: id } });
    res.json(slots);
  } catch (err) {
    console.error('Error fetching availability:', err);
    res.status(500).send('Internal server error');
  }
});

// Students book an appointment
app.post('/students/appointments', authenticate(['student']), async (req, res) => {
  try {
    const { professorId, timeSlot } = req.body;

    if (!professorId || !timeSlot) {
      return res.status(400).send('Professor ID and time slot are required');
    }

    const professor = await User.findOne({ where: { id: professorId, role: 'professor' } });
    if (!professor) {
      return res.status(404).json({ message: 'Professor not found' });
    }

    const availability = await Availability.findOne({
      where: { UserId: professorId, timeSlot },
    });

    if (!availability) {
      return res.status(400).json({ message: 'Slot not available' });
    }

    const existingAppointment = await Appointment.findOne({
      where: { studentId: req.user.id, timeSlot },
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'You already have an appointment at this time' });
    }

    const appointment = await Appointment.create({
      studentId: req.user.id,
      professorId,
      timeSlot,
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error('Error booking appointment:', err);
    res.status(500).send('Internal server error');
  }
});

// Students view their appointments
app.get('/students/appointments', authenticate(['student']), async (req, res) => {
  try {
    const appointments = await Appointment.findAll({ where: { studentId: req.user.id } });
    res.json(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).send('Internal server error');
  }
});

// Professors view their appointments
app.get('/professors/appointments', authenticate(['professor']), async (req, res) => {
  try {
    const appointments = await Appointment.findAll({ where: { professorId: req.user.id } });
    res.json(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).send('Internal server error');
  }
});

// Professors cancel an appointment
app.delete('/professors/appointments/:id', authenticate(['professor']), async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, professorId: req.user.id },
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await appointment.destroy();
    res.send('Appointment cancelled');
  } catch (err) {
    console.error('Error canceling appointment:', err);
    res.status(500).send('Internal server error');
  }
});

// Students cancel their appointment
app.delete('/students/appointments/:id', authenticate(['student']), async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, studentId: req.user.id },
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await appointment.destroy();
    res.send('Appointment cancelled');
  } catch (err) {
    console.error('Error canceling appointment:', err);
    res.status(500).send('Internal server error');
  }
});

// Initialize database
(async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced');
  } catch (err) {
    console.error('Error syncing database:', err);
  }
})();

if (process.env.NODE_ENV !== 'test') {
  app.listen(4000, () => {
    console.log('Server running on http://localhost:4000');
  });
}

module.exports = app;
