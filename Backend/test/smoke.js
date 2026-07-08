// Lightweight smoke tests, hand-rolled (no test framework) so the same
// function can be (a) called by server.js right after startup — non-blocking
// and non-fatal — and (b) run standalone via `npm test`. When this moves into
// CI, consider swapping for node:test or vitest.
//
// Each test has a `required` flag. For now NOTHING is fatal: failures are only
// logged. The marked block at the bottom is where you'd later make required
// failures exit non-zero.

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const tests = [
  {
    name: 'GET /ping returns pong',
    required: true,
    async fn(base) {
      const res = await fetch(`${base}/ping`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.json();
      assert(body.message === 'pong', `expected pong, got ${body.message}`);
    },
  },
  {
    name: 'POST /api/careers returns ranked careers',
    required: true,
    async fn(base) {
      const res = await fetch(`${base}/api/careers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': 'smoke-test' },
        body: JSON.stringify({ R: 5, I: 3, A: 1, S: 0, E: 0, C: 0 }),
      });
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.json();
      assert(Array.isArray(body), 'expected an array');
      assert(body.length > 0, 'expected at least one career');
      assert(body[0].onetsoc_code && body[0].title, 'career missing code/title');
    },
  },
  {
    name: 'POST /api/careers rejects invalid scores',
    required: true,
    async fn(base) {
      const res = await fetch(`${base}/api/careers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notARiasecKey: 1 }),
      });
      assert(res.status === 400, `expected 400, got ${res.status}`);
    },
  },
  {
    name: 'GET /api/jobs/:code returns interest rows',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/jobs/11-1011.00`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.json();
      assert(Array.isArray(body) && body.length > 0, 'expected interest rows');
    },
  },
  {
    name: 'GET /api/majors/:code returns related majors',
    required: false,
    async fn(base) {
      const res = await fetch(`${base}/api/majors/11-1011.00`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.json();
      assert(Array.isArray(body) && body.length > 0, 'expected majors');
      assert('msu_url' in body[0], 'major missing msu_url field');
    },
  },
  {
    name: 'POST /api/ml-careers returns a predicted category',
    required: false, // loads the ONNX model; slower, and fine to fail for now
    async fn(base) {
      const res = await fetch(`${base}/api/ml-careers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ R: 5, I: 3, A: 1, S: 0, E: 0, C: 0 }),
      });
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.json();
      assert(typeof body.predictedCategory === 'string', 'expected predictedCategory string');
    },
  },
];

export async function runSmokeTests(baseUrl) {
  console.log(`\n--- Running smoke tests against ${baseUrl} ---`);
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
  console.log(`--- ${passed}/${results.length} passed`
    + (failedRequired.length ? `, ${failedRequired.length} REQUIRED failing (* )` : '')
    + ' ---\n');

  // LATER: to make required failures fatal (e.g. in CI), do something like:
  // if (failedRequired.length) process.exit(1);

  return results;
}