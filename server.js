require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use('/',       require('./routes/main'));
app.use('/auth',   require('./routes/auth'));
app.use('/student',require('./routes/student'));
app.use('/mentor', require('./routes/mentor'));
app.use('/admin',  require('./routes/admin'));

app.use((req, res) => {
  res.status(404).send('<h2>Page not found</h2><a href="/">Go Home</a>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ElimuLink is running at http://localhost:${PORT}`);
});