const request = require('supertest');
const app = require('./app');
const { sequelize, User, Availability, Appointment } = require('./models');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await sequelize.sync({ force: true });
  const hashedPassword = await bcrypt.hash('password', 10);

  // Create users (students and professors)
  await User.bulkCreate([
    { username: 'studentA1', password: hashedPassword, role: 'student' },
    { username: 'studentA2', password: hashedPassword, role: 'student' },
    { username: 'professorP1', password: hashedPassword, role: 'professor' },
  ]);
});

describe('College Appointment System', () => {
  
  // Test case 1: Student books an appointment, professor cancels it, and student sees no appointments.
  it('should allow a student to book an appointment and handle cancellations', async () => {
    // Log in as student and professor
    const studentLogin = await request(app)
      .post('/auth/login')
      .send({ username: 'studentA1', password: 'password' });
    const professorLogin = await request(app)
      .post('/auth/login')
      .send({ username: 'professorP1', password: 'password' });

    const professorToken = professorLogin.body.token;
    const studentToken = studentLogin.body.token;

    // Get professor's ID dynamically after login
    const professor = await User.findOne({ where: { username: 'professorP1' } });

    // Professor adds availability
    await request(app)
      .post('/professors/availability')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ timeSlots: ['10:00 AM', '11:00 AM'] });

    // Student views availability
    const availability = await request(app)
      .get(`/students/professors/${professor.id}/availability`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(availability.body.length).toBe(2); // Expecting 2 slots

    // Student books an appointment
    const appointment = await request(app)
      .post('/students/appointments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ professorId: professor.id, timeSlot: '10:00 AM' });
    expect(appointment.body.timeSlot).toBe('10:00 AM');

    // Professor cancels the appointment
    await request(app)
      .delete(`/professors/appointments/${appointment.body.id}`)
      .set('Authorization', `Bearer ${professorToken}`);

    // Student checks their appointments
    const appointments = await request(app)
      .get('/students/appointments')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(appointments.body.length).toBe(0); // No appointments after cancellation
  });

  // Test case 2: Error when booking an appointment with a non-existent professor
  it('should handle trying to cancel a non-existing appointment', async () => {
    const professorLogin = await request(app)
      .post('/auth/login')
      .send({ username: 'professorP1', password: 'password' });
    
    const professorToken = professorLogin.body.token;
  
    // Try canceling a non-existing appointment
    const response = await request(app)
      .delete('/professors/appointments/999') // Invalid appointment ID
      .set('Authorization', `Bearer ${professorToken}`);
  
    expect(response.status).toBe(404); // Appointment not found
    expect(response.body.message).toBe('Appointment not found');
  });
  
  // Test case 3: Error when booking an appointment in an unavailable time slot
  it('should return an error if a student tries to book an appointment in a time slot that is not available', async () => {
    const studentLogin = await request(app)
      .post('/auth/login')
      .send({ username: 'studentA1', password: 'password' });
    
    const studentToken = studentLogin.body.token;

    // Professor adds availability
    const professorLogin = await request(app)
      .post('/auth/login')
      .send({ username: 'professorP1', password: 'password' });

    const professorToken = professorLogin.body.token;
    const professor = await User.findOne({ where: { username: 'professorP1' } });

    await request(app)
      .post('/professors/availability')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ timeSlots: ['10:00 AM', '11:00 AM'] });

    // Try booking an appointment in a non-available slot
    const response = await request(app)
      .post('/students/appointments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ professorId: professor.id, timeSlot: '12:00 PM' }); // This slot is not available

    expect(response.status).toBe(400); // Slot not available
    expect(response.body.message).toBe('Slot not available');
  });

  // Test case 4: Error when trying to cancel a non-existing appointment
  it('should handle trying to cancel a non-existing appointment', async () => {
    const professorLogin = await request(app)
      .post('/auth/login')
      .send({ username: 'professorP1', password: 'password' });
    
    const professorToken = professorLogin.body.token;

    // Try canceling a non-existing appointment
    const response = await request(app)
      .delete('/professors/appointments/999') // Invalid appointment ID
      .set('Authorization', `Bearer ${professorToken}`);

    expect(response.status).toBe(404); // Appointment not found
    expect(response.body.message).toBe('Appointment not found');
  });

  // Test case 5: Multiple students can book different appointments for the same professor
  it('should allow multiple students to book different appointments for the same professor', async () => {
    const studentLogin1 = await request(app)
      .post('/auth/login')
      .send({ username: 'studentA1', password: 'password' });
    
    const studentLogin2 = await request(app)
      .post('/auth/login')
      .send({ username: 'studentA2', password: 'password' });

    const studentToken1 = studentLogin1.body.token;
    const studentToken2 = studentLogin2.body.token;

    const professorLogin = await request(app)
      .post('/auth/login')
      .send({ username: 'professorP1', password: 'password' });

    const professorToken = professorLogin.body.token;
    const professor = await User.findOne({ where: { username: 'professorP1' } });

    await request(app)
      .post('/professors/availability')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ timeSlots: ['10:00 AM', '11:00 AM'] });

    // First student books an appointment
    const appointment1 = await request(app)
      .post('/students/appointments')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({ professorId: professor.id, timeSlot: '10:00 AM' });
    expect(appointment1.body.timeSlot).toBe('10:00 AM');

    // Second student books an appointment
    const appointment2 = await request(app)
      .post('/students/appointments')
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({ professorId: professor.id, timeSlot: '11:00 AM' });
    expect(appointment2.body.timeSlot).toBe('11:00 AM');
  });

});
