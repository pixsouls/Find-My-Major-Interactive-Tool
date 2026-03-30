const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000; // Can be changed to whatever you need in dev

app.use(cors());

// Connect to DB
const db = new sqlite3.Database(path.join(__dirname, 'test.db'), sqlite3.OPEN_READONLY, (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to database.');
});

// Example route
app.get('/api/majors', (req, res) => {
  db.all('SELECT * FROM majors', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Ping route for testing
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});