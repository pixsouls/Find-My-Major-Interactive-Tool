const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // .verbose() = more verbose info/error messages
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000; // Can be changed to whatever you need in dev

app.use(cors());

// RIASEC element_id mappings
const RIASEC = {
  R: '1.B.1.a',
  I: '1.B.1.b',
  A: '1.B.1.c',
  S: '1.B.1.d',
  E: '1.B.1.e',
  C: '1.B.1.f',
  Realistic:      '1.B.1.a',
  Investigative:  '1.B.1.b',
  Artistic:       '1.B.1.c',
  Social:         '1.B.1.d',
  Enterprising:   '1.B.1.e',
  Conventional:   '1.B.1.f',
};

// Helper to get element_id from either format
function toElementId(key) {
  const id = RIASEC[key];
  if (!id) throw new Error(`Unknown RIASEC key: ${key}`);
  return id;
}

// Connect to DB
const db = new sqlite3.Database(path.join(__dirname, 'test.db'), sqlite3.OPEN_READONLY, (err) => { // might need to change OPEN_READONLY TO OPEN_READWRITE?
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

app.get('/api/jobs/:soc_code', (req, res) => {
  const { soc_code } = req.params;

  console.log(`/api/jobs called with param(s): ${soc_code}`)

  db.all(
    'SELECT * FROM interests WHERE onetsoc_code = ?',
    [soc_code],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: 'No jobs found' });
      res.json(rows);
    }
  );
});

app.get('/api/careers/:RIASECResults', (req, res) => {
  const { RIASEC_results } = req.params;

  console.log(`/api/jobs called with param(s): ${RIASEC_results}`)

  db.all(
    'SELECT * FROM interests WHERE onetsoc_code = ?',
    [soc_code],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: 'No jobs found' });
      res.json(rows);
    }
  );
});