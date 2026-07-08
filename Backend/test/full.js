// Comprehensive HTTP integration tests, hand-rolled (no framework) to match
// the existing smoke-test style. ~10 tests per meaningful route. Assumes the
// server is already running (option (b)); start it in another terminal first.
//
// Each test carries a `required` flag. Nothing is fatal yet — failures are only
// logged. The marked block in run.js is where required failures could later
// become a non-zero exit (e.g. for CI).
//
// State note: these run against a live, long-lived server, so /api/scores and
// /api/collected tests use UNIQUE session ids (a per-run prefix) to avoid
// colliding with each other or with leftover data from previous runs.

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// unique-ish prefix so repeated runs / parallel tests don't clobber each other
const RUN_ID = `test-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

// a known-good O*NET code present in the seed data (Chief Executives)
const KNOWN_CODE = '11-1011.00';

function postJson(base, route, body, headers = {}) {
  return fetch(`${base}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const tests = [
  // ---------------------------------------------------------------------------
  // POST /api/careers
  // ---------------------------------------------------------------------------
  {
    name: 'careers: 200 for valid scores',
    required: true,
    async fn(base) {
      const res = await postJson(base, '/api/careers', { R: 6, I: 5, A: 4, S: 3, E: 2, C: 1 });
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },
  {
    name: 'careers: returns an array',
    required: true,
    async fn(base) {
      const res = await postJson(base, '/api/careers', { R: 6, I: 5, A: 4, S: 3, E: 2, C: 1 });
      const body = await res.json();
      assert(Array.isArray(body), 'expected an array');
    },
  },
  {
    name: 'careers: returns at most 50 results',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/careers', { R: 6, I: 5, A: 4, S: 3, E: 2, C: 1 });
      const body = await res.json();
      assert(body.length <= 50, `expected <= 50, got ${body.length}`);
    },
  },
  {
    name: 'careers: each result has code, title, description',
    required: true,
    async fn(base) {
      const res = await postJson(base, '/api/careers', { R: 6, I: 5, A: 4, S: 3, E: 2, C: 1 });
      const body = await res.json();
      assert(body.length > 0, 'expected at least one result');
      for (const c of body) {
        assert(c.onetsoc_code, 'missing onetsoc_code');
        assert(c.title, 'missing title');
        assert(typeof c.description === 'string', 'missing/invalid description');
      }
    },
  },
  {
    name: 'careers: rejects invalid keys with 400',
    required: true,
    async fn(base) {
      const res = await postJson(base, '/api/careers', { notARiasecKey: 1 });
      assert(res.status === 400, `expected 400, got ${res.status}`);
    },
  },
  {
    name: 'careers: results sorted by top trait descending',
    required: false,
    async fn(base) {
      // top trait is R given this input; the result objects carry an "R" field
      const res = await postJson(base, '/api/careers', { R: 6, I: 5, A: 4, S: 3, E: 2, C: 1 });
      const body = await res.json();
      assert(body.length > 1, 'need 2+ results to check ordering');
      let prev = Infinity;
      for (const c of body) {
        const v = Number(c.R);
        assert(v <= prev + 1e-9, `not descending by R: ${v} after ${prev}`);
        prev = v;
      }
    },
  },
  {
    name: 'careers: includes the two top-trait fields',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/careers', { R: 6, I: 5, A: 4, S: 3, E: 2, C: 1 });
      const body = await res.json();
      assert('R' in body[0] && 'I' in body[0], 'expected R and I trait fields on result');
    },
  },
  {
    name: 'careers: returned codes are unique',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/careers', { R: 6, I: 5, A: 4, S: 3, E: 2, C: 1 });
      const body = await res.json();
      const codes = body.map(c => c.onetsoc_code);
      assert(new Set(codes).size === codes.length, 'duplicate codes in results');
    },
  },
  {
    name: 'careers: works with x-session-id header',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/careers',
        { R: 6, I: 5, A: 4, S: 3, E: 2, C: 1 },
        { 'x-session-id': `${RUN_ID}-careers` });
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },
  {
    name: 'careers: works without a session id (anonymous)',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/careers', { R: 1, I: 1, A: 1, S: 1, E: 1, C: 6 });
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },

  // ---------------------------------------------------------------------------
  // GET /api/jobs/:soc_code
  // ---------------------------------------------------------------------------
  {
    name: 'jobs: 200 for known code',
    required: true,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/${KNOWN_CODE}`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },
  {
    name: 'jobs: returns a non-empty array',
    required: true,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/${KNOWN_CODE}`);
      const body = await res.json();
      assert(Array.isArray(body) && body.length > 0, 'expected non-empty array');
    },
  },
  {
    name: 'jobs: rows match requested code',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/${KNOWN_CODE}`);
      const body = await res.json();
      for (const row of body) {
        assert(row.onetsoc_code === KNOWN_CODE, `row code ${row.onetsoc_code} != ${KNOWN_CODE}`);
      }
    },
  },
  {
    name: 'jobs: rows have element_id',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/${KNOWN_CODE}`);
      const body = await res.json();
      for (const row of body) assert(row.element_id, 'row missing element_id');
    },
  },
  {
    name: 'jobs: rows have numeric data_value',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/${KNOWN_CODE}`);
      const body = await res.json();
      for (const row of body) {
        assert(typeof row.data_value === 'number' && !Number.isNaN(row.data_value),
          `bad data_value: ${row.data_value}`);
      }
    },
  },
  {
    name: 'jobs: rows have scale_id',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/${KNOWN_CODE}`);
      const body = await res.json();
      for (const row of body) assert('scale_id' in row, 'row missing scale_id');
    },
  },
  {
    name: 'jobs: rows have domain_source',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/${KNOWN_CODE}`);
      const body = await res.json();
      for (const row of body) assert('domain_source' in row, 'row missing domain_source');
    },
  },
  {
    name: 'jobs: 404 for unknown code',
    required: true,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/99-9999.99`);
      assert(res.status === 404, `expected 404, got ${res.status}`);
    },
  },
  {
    name: 'jobs: 404 for malformed code',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/not-a-code`);
      assert(res.status === 404, `expected 404, got ${res.status}`);
    },
  },
  {
    name: 'jobs: data_values are within O*NET range (1-7)',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/${KNOWN_CODE}`);
      const body = await res.json();
      for (const row of body) {
        assert(row.data_value >= 0 && row.data_value <= 7,
          `data_value out of range: ${row.data_value}`);
      }
    },
  },

  // ---------------------------------------------------------------------------
  // POST /api/ml-careers
  // ---------------------------------------------------------------------------
  {
    name: 'ml: 200 for valid scores',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/ml-careers', { R: 5, I: 3, A: 1, S: 0, E: 0, C: 0 });
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },
  {
    name: 'ml: returns predictedCategory string',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/ml-careers', { R: 5, I: 3, A: 1, S: 0, E: 0, C: 0 });
      const body = await res.json();
      assert(typeof body.predictedCategory === 'string' && body.predictedCategory.length > 0,
        'expected non-empty predictedCategory');
    },
  },
  {
    name: 'ml: returns normalized array',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/ml-careers', { R: 5, I: 3, A: 1, S: 0, E: 0, C: 0 });
      const body = await res.json();
      assert(Array.isArray(body.normalized), 'expected normalized array');
    },
  },
  {
    name: 'ml: normalized has length 6',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/ml-careers', { R: 5, I: 3, A: 1, S: 0, E: 0, C: 0 });
      const body = await res.json();
      assert(body.normalized.length === 6, `expected 6, got ${body.normalized.length}`);
    },
  },
  {
    name: 'ml: normalized values are within 0..1',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/ml-careers', { R: 5, I: 3, A: 1, S: 0, E: 0, C: 0 });
      const body = await res.json();
      for (const v of body.normalized) {
        assert(v >= 0 && v <= 1, `normalized value out of range: ${v}`);
      }
    },
  },
  {
    name: 'ml: highest raw score normalizes to 1',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/ml-careers', { R: 5, I: 3, A: 1, S: 0, E: 0, C: 0 });
      const body = await res.json();
      assert(Math.max(...body.normalized) === 1, 'max normalized should be 1');
    },
  },
  {
    name: 'ml: lowest raw score normalizes to 0',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/ml-careers', { R: 5, I: 3, A: 1, S: 0, E: 0, C: 0 });
      const body = await res.json();
      assert(Math.min(...body.normalized) === 0, 'min normalized should be 0');
    },
  },
  {
    name: 'ml: handles all-equal scores without crashing',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/ml-careers', { R: 3, I: 3, A: 3, S: 3, E: 3, C: 3 });
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },
  {
    name: 'ml: high-Social input returns a category',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/ml-careers', { R: 0, I: 1, A: 2, S: 6, E: 3, C: 1 });
      const body = await res.json();
      assert(typeof body.predictedCategory === 'string', 'expected a category');
    },
  },
  {
    name: 'ml: normalized preserves input order (R first)',
    required: false,
    async fn(base) {
      // R is the unique max, so normalized[0] should be the max (1)
      const res = await postJson(base, '/api/ml-careers', { R: 9, I: 1, A: 1, S: 1, E: 1, C: 1 });
      const body = await res.json();
      assert(body.normalized[0] === 1, 'expected first (R) to be the max');
    },
  },

  // ---------------------------------------------------------------------------
  // POST /api/scores
  // ---------------------------------------------------------------------------
  {
    name: 'scores: 200 success for valid payload',
    required: true,
    async fn(base) {
      const res = await postJson(base, '/api/scores',
        { scores: { R: 1, I: 2, A: 3, S: 4, E: 5, C: 6 }, questionsAnswered: 12 },
        { 'x-session-id': `${RUN_ID}-s1` });
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },
  {
    name: 'scores: response has success:true',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/scores',
        { scores: { R: 1, I: 2, A: 3, S: 4, E: 5, C: 6 }, questionsAnswered: 12 },
        { 'x-session-id': `${RUN_ID}-s2` });
      const body = await res.json();
      assert(body.success === true, 'expected success:true');
    },
  },
  {
    name: 'scores: rejects invalid keys with 400',
    required: true,
    async fn(base) {
      const res = await postJson(base, '/api/scores', { scores: { bad: 1 }, questionsAnswered: 1 });
      assert(res.status === 400, `expected 400, got ${res.status}`);
    },
  },
  {
    name: 'scores: rejects missing scores with 400',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/scores', { questionsAnswered: 1 });
      assert(res.status === 400, `expected 400, got ${res.status}`);
    },
  },
  {
    name: 'scores: accepts a payload without questionsAnswered',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/scores',
        { scores: { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1 } },
        { 'x-session-id': `${RUN_ID}-s3` });
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },
  {
    name: 'scores: submission appears in /api/collected',
    required: false,
    async fn(base) {
      const sid = `${RUN_ID}-s4`;
      await postJson(base, '/api/scores',
        { scores: { R: 2, I: 2, A: 2, S: 2, E: 2, C: 2 }, questionsAnswered: 24 },
        { 'x-session-id': sid });
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      assert(body.some(r => r.session_id === sid), 'posted session not found in collected');
    },
  },
  {
    name: 'scores: higher questions_answered overwrites scores',
    required: false,
    async fn(base) {
      const sid = `${RUN_ID}-s5`;
      await postJson(base, '/api/scores',
        { scores: { R: 1, I: 0, A: 0, S: 0, E: 0, C: 0 }, questionsAnswered: 12 },
        { 'x-session-id': sid });
      await postJson(base, '/api/scores',
        { scores: { R: 9, I: 0, A: 0, S: 0, E: 0, C: 0 }, questionsAnswered: 48 },
        { 'x-session-id': sid });
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      // last row for this session should reflect the 48-question run
      const rows = body.filter(r => r.session_id === sid);
      const last = rows[rows.length - 1];
      assert(Number(last.questions_answered) === 48, `expected 48, got ${last.questions_answered}`);
      assert(Number(last.user_R) === 9, `expected R=9, got ${last.user_R}`);
    },
  },
  {
    name: 'scores: lower questions_answered does NOT overwrite scores',
    required: false,
    async fn(base) {
      const sid = `${RUN_ID}-s6`;
      await postJson(base, '/api/scores',
        { scores: { R: 7, I: 0, A: 0, S: 0, E: 0, C: 0 }, questionsAnswered: 48 },
        { 'x-session-id': sid });
      await postJson(base, '/api/scores',
        { scores: { R: 1, I: 0, A: 0, S: 0, E: 0, C: 0 }, questionsAnswered: 12 },
        { 'x-session-id': sid });
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      const rows = body.filter(r => r.session_id === sid);
      const last = rows[rows.length - 1];
      assert(Number(last.user_R) === 7, `expected R to stay 7, got ${last.user_R}`);
    },
  },
  {
    name: 'scores: partial scores object still rejected (incomplete keys ok, wrong keys not)',
    required: false,
    async fn(base) {
      // a key not in RIASEC should 400 even if mixed with valid ones
      const res = await postJson(base, '/api/scores',
        { scores: { R: 1, Z: 2 }, questionsAnswered: 1 });
      assert(res.status === 400, `expected 400, got ${res.status}`);
    },
  },
  {
    name: 'scores: accepts anonymous (no session id)',
    required: false,
    async fn(base) {
      const res = await postJson(base, '/api/scores',
        { scores: { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1 }, questionsAnswered: 6 });
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },

  // ---------------------------------------------------------------------------
  // GET /api/collected
  // ---------------------------------------------------------------------------
  {
    name: 'collected: 200 once data exists',
    required: false,
    async fn(base) {
      // ensure at least one row exists first
      await postJson(base, '/api/scores',
        { scores: { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1 }, questionsAnswered: 6 },
        { 'x-session-id': `${RUN_ID}-c1` });
      const res = await fetch(`${base}/api/collected`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },
  {
    name: 'collected: returns an array',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      assert(Array.isArray(body), 'expected an array');
    },
  },
  {
    name: 'collected: rows have session_id',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      assert(body.length > 0 && 'session_id' in body[0], 'rows missing session_id');
    },
  },
  {
    name: 'collected: rows have all six user_ trait fields',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      const r = body[0];
      for (const k of ['user_R', 'user_I', 'user_A', 'user_S', 'user_E', 'user_C']) {
        assert(k in r, `row missing ${k}`);
      }
    },
  },
  {
    name: 'collected: rows have questions_answered',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      assert('questions_answered' in body[0], 'row missing questions_answered');
    },
  },
  {
    name: 'collected: rows have created_at',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      assert('created_at' in body[0], 'row missing created_at');
    },
  },
  {
    name: 'collected: every row has the same field set',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      const keys = Object.keys(body[0]).sort().join(',');
      for (const row of body) {
        assert(Object.keys(row).sort().join(',') === keys, 'inconsistent columns across rows');
      }
    },
  },
  {
    name: 'collected: created_at parses as a date',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      assert(!Number.isNaN(Date.parse(body[0].created_at)), 'created_at not a valid date');
    },
  },
  {
    name: 'collected: reflects a freshly posted unique session',
    required: false,
    async fn(base) {
      const sid = `${RUN_ID}-c2`;
      await postJson(base, '/api/scores',
        { scores: { R: 4, I: 4, A: 4, S: 4, E: 4, C: 4 }, questionsAnswered: 36 },
        { 'x-session-id': sid });
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      assert(body.some(r => r.session_id === sid), 'fresh session not reflected');
    },
  },
  {
    name: 'collected: user_ values are numeric strings',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/collected`);
      const body = await res.json();
      assert(!Number.isNaN(Number(body[0].user_R)), 'user_R not numeric');
    },
  },

  // ---------------------------------------------------------------------------
  // GET /api/majors/:onetsoc_code
  // ---------------------------------------------------------------------------
  {
    name: 'majors: 200 for known code',
    required: true,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/${KNOWN_CODE}`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
    },
  },
  {
    name: 'majors: returns a non-empty array',
    required: true,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/${KNOWN_CODE}`);
      const body = await res.json();
      assert(Array.isArray(body) && body.length > 0, 'expected non-empty array');
    },
  },
  {
    name: 'majors: rows have major_name',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/${KNOWN_CODE}`);
      const body = await res.json();
      for (const m of body) assert(m.major_name, 'row missing major_name');
    },
  },
  {
    name: 'majors: rows have numeric match_strength',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/${KNOWN_CODE}`);
      const body = await res.json();
      for (const m of body) {
        assert(typeof m.match_strength === 'number', `match_strength not number: ${m.match_strength}`);
      }
    },
  },
  {
    name: 'majors: match_strength within 0..1',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/${KNOWN_CODE}`);
      const body = await res.json();
      for (const m of body) {
        assert(m.match_strength >= 0 && m.match_strength <= 1, `out of range: ${m.match_strength}`);
      }
    },
  },
  {
    name: 'majors: every row has an msu_url field (string or null)',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/${KNOWN_CODE}`);
      const body = await res.json();
      for (const m of body) {
        assert('msu_url' in m, 'row missing msu_url');
        assert(m.msu_url === null || typeof m.msu_url === 'string', 'msu_url wrong type');
      }
    },
  },
  {
    name: 'majors: sorted by match_strength descending',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/${KNOWN_CODE}`);
      const body = await res.json();
      let prev = Infinity;
      for (const m of body) {
        assert(m.match_strength <= prev + 1e-9, `not descending: ${m.match_strength} after ${prev}`);
        prev = m.match_strength;
      }
    },
  },
  {
    name: 'majors: 404 for unknown code',
    required: true,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/99-9999.99`);
      assert(res.status === 404, `expected 404, got ${res.status}`);
    },
  },
  {
    name: 'majors: known code includes Business Administration',
    required: false,
    async fn(base) {
      // from the seed CSV, 11-1011.00 maps to Business Administration
      const res = await fetch(`${base}/api/majors/${KNOWN_CODE}`);
      const body = await res.json();
      assert(body.some(m => m.major_name === 'Business Administration'),
        'expected Business Administration among majors');
    },
  },
  {
    name: 'majors: any populated msu_url is an MSU Denver link',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/${KNOWN_CODE}`);
      const body = await res.json();
      for (const m of body) {
        if (m.msu_url) {
          assert(m.msu_url.includes('msudenver.edu'), `unexpected url: ${m.msu_url}`);
        }
      }
    },
  },
];

export async function runFullTests(baseUrl) {
  console.log(`\n=== Running full integration tests against ${baseUrl} ===`);
  const results = [];

  for (const t of tests) {
    try {
      await t.fn(baseUrl);
      console.log(`  PASS  ${t.name}`);
      results.push({ name: t.name, required: t.required, passed: true });
    } catch (err) {
      const tag = t.required ? 'FAIL* ' : 'FAIL  ';
      console.log(`  ${tag}${t.name}  →  ${err.message}`);
      results.push({ name: t.name, required: t.required, passed: false, error: err.message });
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failedRequired = results.filter(r => r.required && !r.passed);
  console.log(`=== ${passed}/${results.length} passed`
    + (failedRequired.length ? `, ${failedRequired.length} REQUIRED failing (*)` : '')
    + ' ===\n');

  return results;
}