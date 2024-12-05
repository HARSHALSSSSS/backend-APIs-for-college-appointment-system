# backend-APIs-for-college-appointment-system
Develop backend APIs with one automated test case for a college appointment system that allows students to book appointments with professors. The system should enable professors to specify their availability, manage bookings, and allow students to authenticate, view available slots, and book appointments.
#
Features
User authentication (Registration & Login).
Role-based access control (Professor and Student).
Professors can specify their availability.
Students can view professor availability and book appointments.
Professors and students can cancel and view their appointments.
Prerequisites
# Make sure you have the following installed:
Node.js (v14 or higher)
npm (Node Package Manager)
# Installation
Install dependencies:
Copy code
npm install
Set up the database:
The application uses SQLite by default. No additional setup is required for the database.
If you need to use another database, modify the Sequelize configuration in the models/index.js file.
Run the application:

# Libraries to Install
The following dependencies are used in this project:
Production Dependencies
express: Web framework for Node.js.
bcrypt: Library for hashing passwords.
jsonwebtoken: For JWT-based authentication.
sequelize: ORM for database interaction.
sqlite3: SQLite database driver.
Install these dependencies with:

Copy code
npm install express bcrypt jsonwebtoken sequelize sqlite3
Development Dependencies
nodemon: Automatically restarts the server when code changes are detected.
dotenv: For managing environment variables (optional, based on your setup).
Install these development dependencies with:

bash
Copy code
npm install --save-dev nodemon dotenv
API Endpoints
Authentication
POST /auth/register: Register a new user.
json
Copy code
{
  "username": "example",
  "password": "password123",
  "role": "professor" // or "student"
}
POST /auth/login: Login and receive a JWT token.
json
Copy code
{
  "username": "example",
  "password": "password123"
}
Professor Endpoints
POST /professors/availability: Add availability slots (requires professor role).
json
Copy code
{
  "timeSlots": ["2024-12-10T09:00:00Z", "2024-12-10T10:00:00Z"]
}
GET /professors/appointments: View professor's appointments.
Student Endpoints
GET /students/professors/:id/availability: View a professor's availability.
POST /students/appointments: Book an appointment with a professor.
json
Copy code
{
  "professorId": 1,
  "timeSlot": "2024-12-10T09:00:00Z"
}
GET /students/appointments: View the student's appointments.
