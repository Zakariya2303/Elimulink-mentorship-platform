# ElimuLink — Web-Based Student Mentorship and Career Guidance Platform

A full-stack web application connecting Kenyan university students with alumni 
and industry professionals for structured, free, AI-enhanced career mentorship.

**Built with:** Node.js · Express.js · MySQL · Bootstrap 5 · EJS · bcryptjs


## How to Run the Backend

### Requirements
- Node.js version 18 LTS or higher
- MySQL 8.0
- Visual Studio Code (recommended)

### Setup Steps

1. Clone the repository:
   git clone https://github.com/yourusername/Elimulink-mentorship-platform.git

2. Navigate into the project folder:
   cd elimulink-mentorship-platform

3. Install all dependencies:
   npm install

4. Create a .env file in the root folder with these values:
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=elimulink
   DB_PORT=3307
   SESSION_SECRET=elimulink_super_secret_key

5. Set up the database:
   - Open MySQL Workbench
   - Run the database.sql file to create all tables

6. Start the server:
   node server.js

7. Open your browser and go to:
   http://localhost:3000

---

## Database Used

MySQL 8.0 — relational database with 7 normalized tables:
- users
- student_profiles
- mentor_profiles
- mentorship_requests
- sessions
- messages
- resources

All tables use primary keys, foreign keys with ON DELETE CASCADE, and ENUM 
constraints. Passwords are hashed with bcrypt before storage.

## Statistics API Endpoint

The admin dashboard statistics are retrieved dynamically from the database 
through this route:

GET /admin/dashboard

This endpoint is protected by two middleware layers:
- requireLogin() — checks that an active session exists
- requireRole('admin') — checks that the user's role is admin


## How the Backend Retrieves Statistics from the Database

When an admin visits /admin/dashboard, the following SQL COUNT queries run 
on the server in routes/admin.js:

```sql
SELECT COUNT(*) AS count FROM users;
SELECT COUNT(*) AS count FROM users WHERE role = 'student';
SELECT COUNT(*) AS count FROM users WHERE role = 'mentor';
SELECT COUNT(*) AS count FROM sessions;
```

The results are passed as variables to the admin/dashboard.ejs template 
where they are rendered as the four stat cards. These are not hard-coded — 
the numbers change in real time as users register and sessions are booked.

## Admin Test Account

Email: admin@elimulink.com
Password: password

To create this account, run this SQL in MySQL Workbench after setting up 
the database:

INSERT INTO users (full_name, email, password, role)
VALUES (
  'Admin User',
  'admin@elimulink.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
);


## Security Measures

- bcrypt password hashing with salt round 10
- Parameterised SQL queries throughout (SQL injection prevention)
- Role-based session authentication (student / mentor / admin)
- Environment variables for all sensitive credentials
- ON DELETE CASCADE foreign keys for data integrity


## SDG Alignment

- SDG 4 — Quality Education
- SDG 8 — Decent Work and Economic Growth
- SDG 10 — Reduced Inequalities
