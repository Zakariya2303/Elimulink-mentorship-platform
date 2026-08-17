const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('index', { title: 'ElimuLink — Student Mentorship Platform' });
});

router.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');

  const role = req.session.user.role;
  if (role === 'student') return res.redirect('/student/dashboard');
  if (role === 'mentor')  return res.redirect('/mentor/dashboard');
  if (role === 'admin')   return res.redirect('/admin/dashboard');

  res.redirect('/');
});

module.exports = router;