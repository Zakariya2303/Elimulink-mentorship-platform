function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
}

function requireRole(role) {
  return function (req, res, next) {
    if (req.session && req.session.user && req.session.user.role === role) {
      return next();
    }
    res.redirect('/auth/login');
  };
}

module.exports = { requireLogin, requireRole };