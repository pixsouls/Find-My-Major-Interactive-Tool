import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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

// ---- LOAD SEED DATA INTO RAM AT BOOT ----
// read-only data produced by sqlToJson.js; resets only on restart, which is
// fine since it's only refreshed every few months from O*NET / the school
const DATA_DIR = path.join(__dirname, 'src');
const adaptedCareers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'adaptedCareers.json'), 'utf8'));
const interests = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'interests.json'), 'utf8'));
const careerMajorsRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'careerMajors.json'), 'utf8'));

// pre-index for O(1) lookups
const interestsByCode = new Map();
for (const row of interests) {
  if (!interestsByCode.has(row.onetsoc_code)) interestsByCode.set(row.onetsoc_code, []);
  interestsByCode.get(row.onetsoc_code).push(row);
}
const majorsByCode = new Map();
for (const m of careerMajorsRaw) {
  if (!majorsByCode.has(m.onetsoc_code)) majorsByCode.set(m.onetsoc_code, []);
  majorsByCode.get(m.onetsoc_code).push(m);
}
for (const list of majorsByCode.values()) {
  list.sort((a, b) => b.match_strength - a.match_strength);
}

function approxSizeMB(...objects) {
  const bytes = objects.reduce(
    (sum, obj) => sum + Buffer.byteLength(JSON.stringify(obj)),
    0
  );
  return (bytes / (1024 * 1024)).toFixed(1);
}

console.log(
  `Loaded ${adaptedCareers.length} careers, ${interests.length} interests, `
  + `${careerMajorsRaw.length} major links into memory. `
  + `[Approx. ${approxSizeMB(adaptedCareers, interests, careerMajorsRaw)} mb]`
);

// ---- COLLECTED SCORES (the only thing we "write") ----
// Option (b): an in-memory Map keyed by session_id holds one logical record per
// session (upsert semantics, keeps the run with the most questions_answered)
// for the current server run. On every update we ALSO append the record to
// raw/collected.csv. The CSV is append-only, so a restart never wipes it; the
// file is the persistent record the DSML team reads, and it gets cleared by the
// (not-yet-implemented) post-handoff wipe.
const COLLECTED_PATH = path.join(__dirname, 'raw', 'collected.csv');
const COLLECTED_HEADER = 'session_id,user_R,user_I,user_A,user_S,user_E,user_C,questions_answered,created_at\n';
if (!fs.existsSync(COLLECTED_PATH)) {
  fs.writeFileSync(COLLECTED_PATH, COLLECTED_HEADER);
  console.log('Created raw/collected.csv');
}

const collected = new Map(); // session_id -> record

function appendCollected(rec) {
  const row = [
    rec.session_id, rec.user_R, rec.user_I, rec.user_A,
    rec.user_S, rec.user_E, rec.user_C, rec.questions_answered, rec.created_at,
  ].join(',') + '\n';
  fs.appendFile(COLLECTED_PATH, row, err => {
    if (err) console.error('Failed to append collected row:', err.message);
  });
}

const VALID_RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'];

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.get('/api/jobs/:soc_code', (req, res) => {
  const rows = interestsByCode.get(req.params.soc_code);
  if (!rows || rows.length === 0) return res.status(404).json({ error: 'No jobs found' });
  res.json(rows);
});

app.post('/api/careers', (req, res) => {
  const scores = req.body;
  if (!Object.keys(scores).every(k => VALID_RIASEC.includes(k))) {
    return res.status(400).json({ error: 'Invalid RIASEC scores' });
  }

  const [first, second] = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  // upsert collected scores (overwrite, keep existing questions_answered)
  const sessionId = req.headers['x-session-id'] ?? 'anonymous';
  const existing = collected.get(sessionId);
  const rec = {
    session_id: sessionId,
    user_R: scores.R ?? 0, user_I: scores.I ?? 0, user_A: scores.A ?? 0,
    user_S: scores.S ?? 0, user_E: scores.E ?? 0, user_C: scores.C ?? 0,
    questions_answered: existing?.questions_answered ?? 0,
    created_at: new Date().toISOString(),
  };
  collected.set(sessionId, rec);
  appendCollected(rec);

  const result = [...adaptedCareers]
    .sort((a, b) => (b[first] - a[first]) || (b[second] - a[second]))
    .slice(0, 50)
    .map(c => ({
      onetsoc_code: c.onetsoc_code,
      title: c.title,
      description: c.description,
      [first]: c[first],
      [second]: c[second],
    }));

  if (result.length === 0) return res.status(404).json({ error: 'No careers found' });
  res.json(result);
});

app.post('/api/ml-careers', async (req, res) => {
  const scores = req.body;
  try {
    const raw = [scores.R, scores.I, scores.A, scores.S, scores.E, scores.C];
    const min = Math.min(...raw);
    const max = Math.max(...raw);
    const normalized = raw.map(v => (v - min) / (max - min || 1));

    const session = await ort.InferenceSession.create(path.join(__dirname, 'ml/riasec_model.onnx'));
    const inputTensor = new ort.Tensor('float32', Float32Array.from(normalized), [1, 6]);
    const results = await session.run({ float_input: inputTensor }, ['output_label']);
    const predictedCategory = results['output_label'].data[0];

    res.json({ predictedCategory, normalized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/collected', (req, res) => {
  // return the persisted CSV record (survives restarts; in-memory map does not)
  try {
    const text = fs.readFileSync(COLLECTED_PATH, 'utf8');
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',');
      return Object.fromEntries(headers.map((h, i) => [h, cols[i]]));
    });
    if (rows.length === 0) return res.status(404).json({ error: 'No data collected yet' });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scores', (req, res) => {
  const { scores, questionsAnswered } = req.body;
  const sessionId = req.headers['x-session-id'] ?? 'anonymous';

  if (!scores || !Object.keys(scores).every(k => VALID_RIASEC.includes(k))) {
    return res.status(400).json({ error: 'Invalid RIASEC scores' });
  }

  const qa = questionsAnswered ?? 0;
  const existing = collected.get(sessionId);

  // only overwrite scores if this run answered more questions than the stored one
  let rec;
  if (!existing || qa > existing.questions_answered) {
    rec = {
      session_id: sessionId,
      user_R: scores.R ?? 0, user_I: scores.I ?? 0, user_A: scores.A ?? 0,
      user_S: scores.S ?? 0, user_E: scores.E ?? 0, user_C: scores.C ?? 0,
      questions_answered: qa,
      created_at: new Date().toISOString(),
    };
  } else {
    rec = { ...existing, questions_answered: Math.max(existing.questions_answered, qa) };
  }

  collected.set(sessionId, rec);
  appendCollected(rec);
  res.json({ success: true });
});

app.get('/api/majors/:onetsoc_code', (req, res) => {
  const rows = majorsByCode.get(req.params.onetsoc_code);
  if (!rows || rows.length === 0) return res.status(404).json({ error: 'No majors found for this career' });
  res.json(rows.map(({ major_name, match_strength, msu_url }) => ({ major_name, match_strength, msu_url })));
});

app.use('/api/email', emailRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});