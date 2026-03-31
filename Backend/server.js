const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json()); // Needed to parse JSON request bodies

// RIASEC element_id mappings
const RIASEC = {
  R: '1.B.1.a',
  I: '1.B.1.b',
  A: '1.B.1.c',
  S: '1.B.1.d',
  E: '1.B.1.e',
  C: '1.B.1.f',
  Realistic:     '1.B.1.a',
  Investigative: '1.B.1.b',
  Artistic:      '1.B.1.c',
  Social:        '1.B.1.d',
  Enterprising:  '1.B.1.e',
  Conventional:  '1.B.1.f',
};

function toElementId(key) {
  const id = RIASEC[key];
  if (!id) throw new Error(`Unknown RIASEC key: ${key}`);
  return id;
}

// Connect to DB
const db = new sqlite3.Database(path.join(__dirname, 'test.db'), sqlite3.OPEN_READONLY, (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to database.');
});

// Ping route for testing
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Get all interests for a specific SOC code
app.get('/api/jobs/:soc_code', (req, res) => {
  const { soc_code } = req.params;
  console.log(`/api/jobs called with: ${soc_code}`);

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

// Get career recommendations from RIASEC scores
app.post('/api/careers', (req, res) => {
  const scores = req.body; // e.g. { R: 5, I: 6, A: 1, S: 2, E: 1, C: 3 }
  console.log(`/api/careers called with scores:`, scores);

  // Validate all keys are valid RIASEC letters
  const VALID_RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'];
  if (!Object.keys(scores).every(k => VALID_RIASEC.includes(k))) {
    return res.status(400).json({ error: 'Invalid RIASEC scores' });
  }

  // Sort by score descending, take top 2
  const [first, second] = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);

  console.log(`Top RIASEC: ${first}, ${second}`);

  const query = `
    SELECT onetsoc_code, title, ${first}, ${second}
    FROM AdaptedCareers
    ORDER BY ${first} DESC, ${second} DESC
    LIMIT 50
  `;

  

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: 'No careers found' });
    console.log(rows);
    res.json(rows);
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});