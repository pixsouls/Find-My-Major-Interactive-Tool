import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import emailRouter from './utils/email.js';
import dotenv from 'dotenv';
import * as ort from 'onnxruntime-node';

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
    INSERT INTO "F2Collected" (session_id, user_R, user_I, user_A, user_S, user_E, user_C)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (session_id) DO UPDATE SET
      user_R = EXCLUDED.user_R,
      user_I = EXCLUDED.user_I,
      user_A = EXCLUDED.user_A,
      user_S = EXCLUDED.user_S,
      user_E = EXCLUDED.user_E,
      user_C = EXCLUDED.user_C,
      created_at = NOW()
  `;

  try {
    await db.query(insertQuery, [
      req.headers['x-session-id'] ?? 'anonymous',
      scores.R ?? 0,
      scores.I ?? 0,
      scores.A ?? 0,
      scores.S ?? 0,
      scores.E ?? 0,
      scores.C ?? 0
    ]);
    const result = await db.query(selectQuery);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No careers found' });
    console.log(result.rows);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ml-careers', async (req, res) => {
  const scores = req.body;
  try {
    const raw = [scores.R, scores.I, scores.A, scores.S, scores.E, scores.C];
    const min = Math.min(...raw);
    const max = Math.max(...raw);
    const normalized = raw.map(v => (v - min) / (max - min || 1));

    const session = await ort.InferenceSession.create(
      path.join(__dirname, 'ml/riasec_model.onnx')
    );
    const inputTensor = new ort.Tensor('float32', Float32Array.from(normalized), [1, 6]);
    const results = await session.run({ float_input: inputTensor }, ['output_label']);
    const predictedCategory = results['output_label'].data[0];

    console.log('ML predicted category:', predictedCategory);
    res.json({ predictedCategory, normalized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/collected', async (req, res) => {
  console.log('/api/collected called');
  try {
    const result = await db.query(`
      SELECT session_id, user_R, user_I, user_A, user_S, user_E, user_C, questions_answered, created_at
      FROM "F2Collected"
      ORDER BY created_at DESC
    `);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No data collected yet' });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scores', async (req, res) => {
  const { scores, questionsAnswered } = req.body;
  const sessionId = req.headers['x-session-id'] ?? 'anonymous';
  console.log(`/api/scores called with session: ${sessionId}, questions: ${questionsAnswered}`);

  const VALID_RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'];
  if (!scores || !Object.keys(scores).every(k => VALID_RIASEC.includes(k))) {
    return res.status(400).json({ error: 'Invalid RIASEC scores' });
  }

  try {
    await db.query(`
      INSERT INTO "F2Collected" (session_id, user_R, user_I, user_A, user_S, user_E, user_C, questions_answered)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (session_id) DO UPDATE SET
        user_R = CASE WHEN EXCLUDED.questions_answered > "F2Collected".questions_answered THEN EXCLUDED.user_R ELSE "F2Collected".user_R END,
        user_I = CASE WHEN EXCLUDED.questions_answered > "F2Collected".questions_answered THEN EXCLUDED.user_I ELSE "F2Collected".user_I END,
        user_A = CASE WHEN EXCLUDED.questions_answered > "F2Collected".questions_answered THEN EXCLUDED.user_A ELSE "F2Collected".user_A END,
        user_S = CASE WHEN EXCLUDED.questions_answered > "F2Collected".questions_answered THEN EXCLUDED.user_S ELSE "F2Collected".user_S END,
        user_E = CASE WHEN EXCLUDED.questions_answered > "F2Collected".questions_answered THEN EXCLUDED.user_E ELSE "F2Collected".user_E END,
        user_C = CASE WHEN EXCLUDED.questions_answered > "F2Collected".questions_answered THEN EXCLUDED.user_C ELSE "F2Collected".user_C END,
        questions_answered = GREATEST("F2Collected".questions_answered, EXCLUDED.questions_answered),
        created_at = CASE WHEN EXCLUDED.questions_answered > "F2Collected".questions_answered THEN NOW() ELSE "F2Collected".created_at END
    `, [
      sessionId,
      scores.R ?? 0,
      scores.I ?? 0,
      scores.A ?? 0,
      scores.S ?? 0,
      scores.E ?? 0,
      scores.C ?? 0,
      questionsAnswered ?? 0
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/majors/:onetsoc_code', async (req, res) => {
  const { onetsoc_code } = req.params;
  try {
    const result = await db.query(
      `SELECT major_name, match_strength, msu_url
       FROM career_majors
       WHERE onetsoc_code = $1
       ORDER BY match_strength DESC`,
      [onetsoc_code]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No majors found for this career' });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/email', emailRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});