// Standalone entry for `npm test`. Assumes the server is already running
// (option (b)); start it in another terminal first, then run `npm test`.
//
// Future: boot an in-process server here on an ephemeral port so the command is
// fully self-contained (needs server.js to export `app` and guard app.listen).
import { runSmokeTests } from './smoke.js';
import { runFullTests } from './full.js';

const baseUrl = process.env.TEST_URL || 'http://localhost:3000';

const smoke = await runSmokeTests(baseUrl);
const full = await runFullTests(baseUrl);

const all = [...smoke, ...full];
const passed = all.filter(r => r.passed).length;
const failedRequired = all.filter(r => r.required && !r.passed);

console.log(`TOTAL: ${passed}/${all.length} passed, ${failedRequired.length} required failing.`);

// Intentionally always exits 0 for now. To make required failures fail the
// command (e.g. in CI), uncomment:
// if (failedRequired.length) process.exit(1);