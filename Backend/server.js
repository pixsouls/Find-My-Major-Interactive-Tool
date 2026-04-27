import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import emailRouter from './utils/email.js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

db.connect((err) => {
  if (err) return console.error('Database connection error:', err.message);
  console.log('Connected to database.');
});

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.get('/api/jobs/:soc_code', async (req, res) => {
  const { soc_code } = req.params;
  console.log(`/api/jobs called with: ${soc_code}`);
  try {
    const result = await db.query(
      'SELECT * FROM interests WHERE onetsoc_code = $1',
      [soc_code]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No jobs found' });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/careers', async (req, res) => {
  const scores = req.body;
  console.log(`/api/careers called with scores:`, scores);

  const VALID_RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'];
  if (!Object.keys(scores).every(k => VALID_RIASEC.includes(k))) {
    return res.status(400).json({ error: 'Invalid RIASEC scores' });
  }

  const [first, second] = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);

  console.log(`Top RIASEC: ${first}, ${second}`);

  const selectQuery = `
    SELECT a.onetsoc_code, a.title, a."${first}", a."${second}", o.description
    FROM "AdaptedCareers" a
    JOIN occupation_data o ON a.onetsoc_code = o.onetsoc_code
    ORDER BY a."${first}" DESC, a."${second}" DESC
    LIMIT 50
  `;

  const insertQuery = `
    INSERT INTO "F2Collected" (onetsoc_code, title, "R", "I", "A", "S", "E", "C")
    SELECT onetsoc_code, title, "R", "I", "A", "S", "E", "C"
    FROM "AdaptedCareers"
    ORDER BY "${first}" DESC, "${second}" DESC
    LIMIT 50
    ON CONFLICT DO NOTHING
  `;

  try {
    await db.query(insertQuery);
    const result = await db.query(selectQuery);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No careers found' });
    console.log(result.rows);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/email', emailRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});