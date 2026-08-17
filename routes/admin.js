const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireLogin, requireRole } = require('../middleware/auth');

router.get('/dashboard', requireLogin, requireRole('admin'), async (req, res) => {
  try {
    const [[totalUsers]]    = await db.query('SELECT COUNT(*) as count FROM users');
    const [[totalStudents]] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const [[totalMentors]]  = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'mentor'");
    const [[totalSessions]] = await db.query('SELECT COUNT(*) as count FROM sessions');

    const [recentUsers] = await db.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT 8'
    );

    const [recentSessions] = await db.query(`
      SELECT s.*,
             u1.full_name AS student_name,
             u2.full_name AS mentor_name
      FROM   sessions s
      JOIN   users u1 ON s.student_id = u1.id
      JOIN   users u2 ON s.mentor_id  = u2.id
      ORDER  BY s.created_at DESC
      LIMIT  5
    `);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard — ElimuLink',
      stats: {
        totalUsers:    totalUsers.count,
        totalStudents: totalStudents.count,
        totalMentors:  totalMentors.count,
        totalSessions: totalSessions.count
      },
      recentUsers,
      recentSessions
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong. Please try again.');
  }
});
// ── All Users ─────────────────────────────────
router.get('/users', requireLogin, requireRole('admin'), async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users ORDER BY created_at DESC');
    res.render('admin/users', { title: 'Manage Users — ElimuLink', users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

// ── Delete User ───────────────────────────────
router.post('/users/:id/delete', requireLogin, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ? AND role != "admin"', [req.params.id]);
  } catch (err) { console.error(err); }
  res.redirect('/admin/users');
});

// ── All Sessions ──────────────────────────────
router.get('/sessions', requireLogin, requireRole('admin'), async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT s.*, u1.full_name AS student_name, u2.full_name AS mentor_name
      FROM   sessions s
      JOIN   users u1 ON s.student_id = u1.id
      JOIN   users u2 ON s.mentor_id  = u2.id
      ORDER  BY s.created_at DESC
    `);
    res.render('admin/sessions', { title: 'All Sessions — ElimuLink', sessions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

// ── Resources ─────────────────────────────────
router.get('/resources', requireLogin, requireRole('admin'), async (req, res) => {
  try {
    const [resources] = await db.query(
      'SELECT r.*, u.full_name AS uploaded_by_name FROM resources r LEFT JOIN users u ON r.uploaded_by = u.id ORDER BY r.created_at DESC'
    );
    res.render('admin/resources', { title: 'Resources — ElimuLink', resources });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

// ── Delete Resource ───────────────────────────
router.post('/resources/:id/delete', requireLogin, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM resources WHERE id = ?', [req.params.id]);
  } catch (err) { console.error(err); }
  res.redirect('/admin/resources');
});
module.exports = router;