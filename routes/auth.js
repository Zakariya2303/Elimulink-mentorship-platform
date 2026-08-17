const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// ── Show Login Page ──────────────────────────
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Log In', error: null });
});

// ── Handle Login Form ────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.render('login', { title: 'Log In', error: 'No account found with that email.' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render('login', { title: 'Log In', error: 'Incorrect password. Please try again.' });
    }

    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      university: user.university
    };

    res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.render('login', { title: 'Log In', error: 'Something went wrong. Please try again.' });
  }
});

// ── Show Register Page ───────────────────────
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  const role = req.query.role || 'student';
  res.render('register', { title: 'Create Account', error: null, role });
});

// ── Handle Register Form ─────────────────────
router.post('/register', async (req, res) => {
  const { full_name, email, password, role, university } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

    if (existing.length > 0) {
      return res.render('register', {
        title: 'Create Account',
        error: 'An account with that email already exists.',
        role
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password, role, university) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, hashedPassword, role, university]
    );

    const userId = result.insertId;

    if (role === 'student') {
      await db.query(
        'INSERT INTO student_profiles (user_id) VALUES (?)',
        [userId]
      );
    }

    if (role === 'mentor') {
      await db.query(
        'INSERT INTO mentor_profiles (user_id) VALUES (?)',
        [userId]
      );
    }

    req.session.user = {
      id: userId,
      full_name,
      email,
      role,
      university
    };

    res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.render('register', {
      title: 'Create Account',
      error: 'Something went wrong. Please try again.',
      role
    });
  }
});

// ── Logout ───────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;