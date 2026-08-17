const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireLogin, requireRole } = require('../middleware/auth');

// ── Dashboard ────────────────────────────────
router.get('/dashboard', requireLogin, requireRole('student'), async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [[upcoming]]  = await db.query(
      "SELECT COUNT(*) as count FROM sessions WHERE student_id = ? AND status = 'upcoming'", [userId]);
    const [[mentors]]   = await db.query(
      "SELECT COUNT(*) as count FROM mentorship_requests WHERE student_id = ? AND status = 'accepted'", [userId]);
    const [[unread]]    = await db.query(
      "SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0", [userId]);
    const [[resources]] = await db.query(
      "SELECT COUNT(*) as count FROM resources");

    const [requests] = await db.query(`
      SELECT mr.*, u.full_name AS mentor_name,
             mp.job_title, mp.company, mp.industry
      FROM   mentorship_requests mr
      JOIN   users u ON mr.mentor_id = u.id
      LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
      WHERE  mr.student_id = ?
      ORDER  BY mr.created_at DESC LIMIT 5
    `, [userId]);

    const [sessions] = await db.query(`
      SELECT s.*, u.full_name AS mentor_name, mp.job_title, mp.company
      FROM   sessions s
      JOIN   users u ON s.mentor_id = u.id
      LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
      WHERE  s.student_id = ? AND s.status = 'upcoming'
      ORDER  BY s.session_date ASC LIMIT 3
    `, [userId]);

    res.render('student/dashboard', {
      title: 'Student Dashboard — ElimuLink',
      stats: {
        upcomingSessions: upcoming.count,
        activeMentors:    mentors.count,
        unreadMessages:   unread.count,
        totalResources:   resources.count
      },
      requests,
      sessions
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading dashboard.');
  }
});

// ── Find Mentors ─────────────────────────────
router.get('/mentors', requireLogin, requireRole('student'), async (req, res) => {
  const userId   = req.session.user.id;
  const industry = req.query.industry || '';
  const search   = req.query.search   || '';

  try {
    let query = `
      SELECT u.id, u.full_name, u.university,
             mp.job_title, mp.company, mp.industry,
             mp.expertise, mp.years_experience, mp.is_available
      FROM   users u
      JOIN   mentor_profiles mp ON u.id = mp.user_id
      WHERE  u.role = 'mentor' AND mp.is_available = 1
    `;
    const params = [];

    if (industry) {
      query += ' AND mp.industry = ?';
      params.push(industry);
    }
    if (search) {
      query += ' AND (u.full_name LIKE ? OR mp.job_title LIKE ? OR mp.company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY u.full_name ASC';

    const [mentors] = await db.query(query, params);

    const [sentRequests] = await db.query(
      'SELECT mentor_id FROM mentorship_requests WHERE student_id = ?', [userId]);
    const alreadySent = sentRequests.map(r => r.mentor_id);

    const industries = [
      'Technology','Finance','Engineering','Law',
      'Medicine','Business','Media','Education','Other'
    ];

    res.render('student/mentors', {
      title: 'Find a Mentor — ElimuLink',
      mentors, alreadySent, industries,
      selectedIndustry: industry, search
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading mentors.');
  }
});

// ── Send Request ─────────────────────────────
router.post('/mentors/request/:mentorId', requireLogin, requireRole('student'), async (req, res) => {
  const studentId = req.session.user.id;
  const mentorId  = req.params.mentorId;
  const { message } = req.body;
  try {
    const [existing] = await db.query(
      'SELECT id FROM mentorship_requests WHERE student_id = ? AND mentor_id = ?',
      [studentId, mentorId]);
    if (existing.length === 0) {
      await db.query(
        'INSERT INTO mentorship_requests (student_id, mentor_id, message) VALUES (?, ?, ?)',
        [studentId, mentorId, message]);
    }
  } catch (err) {
    console.error(err);
  }
  res.redirect('/student/mentors');
});

// ── My Requests ──────────────────────────────
router.get('/requests', requireLogin, requireRole('student'), async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [requests] = await db.query(`
      SELECT mr.*, u.full_name AS mentor_name,
             mp.job_title, mp.company, mp.industry
      FROM   mentorship_requests mr
      JOIN   users u ON mr.mentor_id = u.id
      LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
      WHERE  mr.student_id = ?
      ORDER  BY mr.created_at DESC
    `, [userId]);

    res.render('student/requests', {
      title: 'My Requests — ElimuLink',
      requests
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading requests.');
  }
});

// ── My Sessions ──────────────────────────────
router.get('/sessions', requireLogin, requireRole('student'), async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [sessions] = await db.query(`
      SELECT s.*, u.full_name AS mentor_name, mp.job_title, mp.company
      FROM   sessions s
      JOIN   users u ON s.mentor_id = u.id
      LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
      WHERE  s.student_id = ?
      ORDER  BY s.session_date DESC
    `, [userId]);

    res.render('student/sessions', {
      title: 'My Sessions — ElimuLink',
      sessions
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading sessions.');
  }
});

// ── Resources ────────────────────────────────
router.get('/resources', requireLogin, requireRole('student'), async (req, res) => {
  try {
    const [resources] = await db.query(
      'SELECT r.*, u.full_name AS uploaded_by_name FROM resources r LEFT JOIN users u ON r.uploaded_by = u.id ORDER BY r.created_at DESC'
    );
    res.render('student/resources', {
      title: 'Career Resources — ElimuLink',
      resources
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading resources.');
  }
});

// ── Profile GET ──────────────────────────────
router.get('/profile', requireLogin, requireRole('student'), async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [[userData]] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const [[profile]]  = await db.query('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
    res.render('student/profile', {
      title: 'My Profile — ElimuLink',
      userData,
      profile: profile || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading profile.');
  }
});

// ── Profile POST ─────────────────────────────
router.post('/profile', requireLogin, requireRole('student'), async (req, res) => {
  const userId = req.session.user.id;
  const { full_name, university, bio, course, year_of_study, career_interests } = req.body;
  try {
    await db.query(
      'UPDATE users SET full_name = ?, university = ?, bio = ? WHERE id = ?',
      [full_name, university, bio, userId]);
    await db.query(
      'UPDATE student_profiles SET course = ?, year_of_study = ?, career_interests = ? WHERE user_id = ?',
      [course, year_of_study, career_interests, userId]);
    req.session.user.full_name  = full_name;
    req.session.user.university = university;
    res.redirect('/student/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong saving profile.');
  }
});
// ── Messages Page ─────────────────────────────
router.get('/messages', requireLogin, requireRole('student'), async (req, res) => {
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

    res.render('student/messages', {
      title: 'Messages — ElimuLink',
      conversations,
      messages: [],
      activeId: null,
      activeName: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading messages.');
  }
});

// ── Open a Conversation ───────────────────────
router.get('/messages/:otherId', requireLogin, requireRole('student'), async (req, res) => {
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
      [otherId, userId]
    );

    const [[otherUser]] = await db.query(
      'SELECT full_name FROM users WHERE id = ?', [otherId]
    );

    res.render('student/messages', {
      title: 'Messages — ElimuLink',
      conversations,
      messages,
      activeId: parseInt(otherId),
      activeName: otherUser ? otherUser.full_name : 'Mentor'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading this conversation.');
  }
});

// ── Send a Message ────────────────────────────
router.post('/messages/:otherId/send', requireLogin, requireRole('student'), async (req, res) => {
  const userId  = req.session.user.id;
  const otherId = req.params.otherId;
  const { content } = req.body;
  try {
    await db.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [userId, otherId, content]
    );
  } catch (err) {
    console.error(err);
  }
  res.redirect('/student/messages/' + otherId);
});
// ── AI Mentor Recommendations ─────────────────
router.get('/recommendations', requireLogin, requireRole('student'), async (req, res) => {
  const userId = req.session.user.id;

  try {
    const [[profile]] = await db.query(
      'SELECT * FROM student_profiles WHERE user_id = ?', [userId]
    );
    const [[userData]] = await db.query(
      'SELECT * FROM users WHERE id = ?', [userId]
    );

    const [mentors] = await db.query(`
      SELECT u.id, u.full_name, u.university,
             mp.job_title, mp.company, mp.industry,
             mp.expertise, mp.years_experience, mp.is_available
      FROM   users u
      JOIN   mentor_profiles mp ON u.id = mp.user_id
      WHERE  u.role = 'mentor' AND mp.is_available = 1
    `);

    const [sentRequests] = await db.query(
      'SELECT mentor_id FROM mentorship_requests WHERE student_id = ?', [userId]
    );
    const alreadySent = sentRequests.map(r => r.mentor_id);

    // ── AI Scoring Algorithm ──────────────────
    // Extracts keywords from the student profile
    // and scores each mentor based on how many
    // keywords appear in their expertise and industry
    const studentText = [
      profile ? profile.career_interests || '' : '',
      profile ? profile.course || '' : '',
      userData ? userData.bio || '' : ''
    ].join(' ').toLowerCase();

    const studentKeywords = studentText
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['with','that','this','from','have','will',
                     'they','been','more','your','their','about',
                     'into','which','when','also','just'].includes(w));

    const scoredMentors = mentors.map(mentor => {
      const mentorText = [
        mentor.expertise   || '',
        mentor.industry    || '',
        mentor.job_title   || '',
        mentor.company     || ''
      ].join(' ').toLowerCase();

      let score = 0;
      let matchedKeywords = [];

      studentKeywords.forEach(keyword => {
        if (mentorText.includes(keyword)) {
          score++;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }
      });

      // Bonus points for experience level
      if (mentor.years_experience >= 5)  score += 2;
      if (mentor.years_experience >= 10) score += 2;

      return { ...mentor, score, matchedKeywords };
    });

    // Sort by score descending — highest match first
    scoredMentors.sort((a, b) => b.score - a.score);

    // Top 6 recommendations
    const recommendations = scoredMentors.slice(0, 6);
    const hasProfile = profile &&
      (profile.career_interests || profile.course);

    res.render('student/recommendations', {
      title: 'AI Recommendations — ElimuLink',
      recommendations,
      alreadySent,
      hasProfile,
      studentKeywords: [...new Set(studentKeywords)].slice(0, 10)
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading recommendations.');
  }
});
module.exports = router;