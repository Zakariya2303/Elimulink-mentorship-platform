const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireLogin, requireRole } = require('../middleware/auth');

router.get('/dashboard', requireLogin, requireRole('mentor'), async (req, res) => {
  const userId = req.session.user.id;

  try {
    const [[pending]]   = await db.query(
      "SELECT COUNT(*) as count FROM mentorship_requests WHERE mentor_id = ? AND status = 'pending'",
      [userId]
    );
    const [[upcoming]]  = await db.query(
      "SELECT COUNT(*) as count FROM sessions WHERE mentor_id = ? AND status = 'upcoming'",
      [userId]
    );
    const [[students]]  = await db.query(
      "SELECT COUNT(*) as count FROM mentorship_requests WHERE mentor_id = ? AND status = 'accepted'",
      [userId]
    );
    const [[unread]]    = await db.query(
      "SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0",
      [userId]
    );

    const [pendingRequests] = await db.query(`
      SELECT mr.*, u.full_name AS student_name,
             u.university, sp.course, sp.year_of_study
      FROM   mentorship_requests mr
      JOIN   users u           ON mr.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE  mr.mentor_id = ? AND mr.status = 'pending'
      ORDER  BY mr.created_at DESC
      LIMIT  5
    `, [userId]);

    const [sessions] = await db.query(`
      SELECT s.*, u.full_name AS student_name, u.university
      FROM   sessions s
      JOIN   users u ON s.student_id = u.id
      WHERE  s.mentor_id = ? AND s.status = 'upcoming'
      ORDER  BY s.session_date ASC
      LIMIT  3
    `, [userId]);

    res.render('mentor/dashboard', {
      title: 'Mentor Dashboard — ElimuLink',
      stats: {
        pendingRequests:  pending.count,
        upcomingSessions: upcoming.count,
        activeStudents:   students.count,
        unreadMessages:   unread.count
      },
      pendingRequests,
      sessions
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong. Please try again.');
  }
});

// Accept a request
router.post('/request/:id/accept', requireLogin, requireRole('mentor'), async (req, res) => {
  try {
    await db.query(
      "UPDATE mentorship_requests SET status = 'accepted' WHERE id = ? AND mentor_id = ?",
      [req.params.id, req.session.user.id]
    );
  } catch (err) { console.error(err); }
  res.redirect('/mentor/dashboard');
});

// Decline a request
router.post('/request/:id/decline', requireLogin, requireRole('mentor'), async (req, res) => {
  try {
    await db.query(
      "UPDATE mentorship_requests SET status = 'declined' WHERE id = ? AND mentor_id = ?",
      [req.params.id, req.session.user.id]
    );
  } catch (err) { console.error(err); }
  res.redirect('/mentor/dashboard');
});
// ── Mentor Requests Page ─────────────────────
router.get('/requests', requireLogin, requireRole('mentor'), async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [requests] = await db.query(`
      SELECT mr.*, u.full_name AS student_name,
             u.university, sp.course, sp.year_of_study
      FROM   mentorship_requests mr
      JOIN   users u ON mr.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE  mr.mentor_id = ?
      ORDER  BY mr.created_at DESC
    `, [userId]);
    res.render('mentor/requests', { title: 'Requests — ElimuLink', requests });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

// ── Mentor Sessions Page ──────────────────────
router.get('/sessions', requireLogin, requireRole('mentor'), async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [sessions] = await db.query(`
      SELECT s.*, u.full_name AS student_name, u.university
      FROM   sessions s
      JOIN   users u ON s.student_id = u.id
      WHERE  s.mentor_id = ?
      ORDER  BY s.session_date DESC
    `, [userId]);
    res.render('mentor/sessions', { title: 'My Sessions — ElimuLink', sessions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

// ── Mentor Profile GET ────────────────────────
router.get('/profile', requireLogin, requireRole('mentor'), async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [[userData]] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const [[profile]]  = await db.query('SELECT * FROM mentor_profiles WHERE user_id = ?', [userId]);
    res.render('mentor/profile', {
      title: 'My Profile — ElimuLink',
      userData, profile: profile || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

// ── Mentor Profile POST ───────────────────────
router.post('/profile', requireLogin, requireRole('mentor'), async (req, res) => {
  const userId = req.session.user.id;
  const { full_name, bio, job_title, company, industry, years_experience, is_available, expertise } = req.body;
  try {
    await db.query(
      'UPDATE users SET full_name = ?, bio = ? WHERE id = ?',
      [full_name, bio, userId]);
    await db.query(
      'UPDATE mentor_profiles SET job_title=?, company=?, industry=?, years_experience=?, is_available=?, expertise=? WHERE user_id=?',
      [job_title, company, industry, years_experience, is_available, expertise, userId]);
    req.session.user.full_name = full_name;
    res.redirect('/mentor/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

// ── Mentor Resources Page ─────────────────────
router.get('/resources', requireLogin, requireRole('mentor'), async (req, res) => {
  try {
    const [resources] = await db.query(
      'SELECT r.*, u.full_name AS uploaded_by_name FROM resources r LEFT JOIN users u ON r.uploaded_by = u.id ORDER BY r.created_at DESC'
    );
    res.render('mentor/resources', { title: 'Resources — ElimuLink', resources });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

// ── Add Resource ──────────────────────────────
router.post('/resources/add', requireLogin, requireRole('mentor'), async (req, res) => {
  const { title, category, description, file_url } = req.body;
  try {
    await db.query(
      'INSERT INTO resources (title, category, description, file_url, uploaded_by) VALUES (?,?,?,?,?)',
      [title, category, description, file_url, req.session.user.id]);
  } catch (err) { console.error(err); }
  res.redirect('/mentor/resources');
});

// ── Messages Page ─────────────────────────────
router.get('/messages', requireLogin, requireRole('mentor'), async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [conversations] = await db.query(`
      SELECT DISTINCT
        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_id,
        u.full_name AS other_name,
        (SELECT content FROM messages m2
         WHERE (m2.sender_id = ? AND m2.receiver_id = other_id)
            OR (m2.sender_id = other_id AND m2.receiver_id = ?)
         ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM messages m3
         WHERE m3.sender_id = other_id AND m3.receiver_id = ? AND m3.is_read = 0) AS unread
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
      WHERE m.sender_id = ? OR m.receiver_id = ?
    `, [userId, userId, userId, userId, userId, userId, userId]);

    res.render('mentor/messages', {
      title: 'Messages — ElimuLink',
      conversations,
      messages: [],
      activeId: null,
      activeName: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

router.get('/messages/:otherId', requireLogin, requireRole('mentor'), async (req, res) => {
  const userId  = req.session.user.id;
  const otherId = req.params.otherId;
  try {
    const [conversations] = await db.query(`
      SELECT DISTINCT
        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_id,
        u.full_name AS other_name,
        (SELECT content FROM messages m2
         WHERE (m2.sender_id = ? AND m2.receiver_id = other_id)
            OR (m2.sender_id = other_id AND m2.receiver_id = ?)
         ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM messages m3
         WHERE m3.sender_id = other_id AND m3.receiver_id = ? AND m3.is_read = 0) AS unread
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
      WHERE m.sender_id = ? OR m.receiver_id = ?
    `, [userId, userId, userId, userId, userId, userId, userId]);

    const [messages] = await db.query(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `, [userId, otherId, otherId, userId]);

    await db.query(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?',
      [otherId, userId]);

    const [[otherUser]] = await db.query('SELECT full_name FROM users WHERE id = ?', [otherId]);

    res.render('mentor/messages', {
      title: 'Messages — ElimuLink',
      conversations,
      messages,
      activeId: parseInt(otherId),
      activeName: otherUser ? otherUser.full_name : 'Student'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

router.post('/messages/:otherId/send', requireLogin, requireRole('mentor'), async (req, res) => {
  const userId  = req.session.user.id;
  const otherId = req.params.otherId;
  const { content } = req.body;
  try {
    await db.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?,?,?)',
      [userId, otherId, content]);
  } catch (err) { console.error(err); }
  res.redirect('/mentor/messages/' + otherId);
});
// ── Book a Session Page ───────────────────────
router.get('/sessions/book/:studentId', requireLogin, requireRole('mentor'), async (req, res) => {
  const mentorId  = req.session.user.id;
  const studentId = req.params.studentId;
  try {
    const [[student]] = await db.query(
      'SELECT u.*, sp.course FROM users u LEFT JOIN student_profiles sp ON u.id = sp.user_id WHERE u.id = ?',
      [studentId]
    );
    if (!student) return res.redirect('/mentor/requests');

    res.render('mentor/book-session', {
      title: 'Book a Session — ElimuLink',
      student
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

// ── Submit Session Booking ────────────────────
router.post('/sessions/book/:studentId', requireLogin, requireRole('mentor'), async (req, res) => {
  const mentorId  = req.session.user.id;
  const studentId = req.params.studentId;
  const { session_date, session_time, topic, notes } = req.body;
  try {
    await db.query(
      'INSERT INTO sessions (student_id, mentor_id, session_date, session_time, topic, notes, status) VALUES (?,?,?,?,?,?,?)',
      [studentId, mentorId, session_date, session_time, topic, notes, 'upcoming']
    );
    res.redirect('/mentor/sessions');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong booking the session.');
  }
});
module.exports = router;