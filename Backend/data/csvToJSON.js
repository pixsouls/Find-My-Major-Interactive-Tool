// csvToPrograms.js
//
// One-time converter (run manually, like sqlToJson.js) that turns the new
// MSU Denver catalog "Programs" export (Dataset 1) into a clean programs.json
// the server can load into RAM.
//
// Lives in Backend/data/ alongside the data files; paths resolve relative to
// Backend/data/, and the output JSON is written there too.
//
// Minimal transform:
//   - keeps EVERY column verbatim
//   - keeps Program Description as raw HTML
//   - keeps Structure as one raw text blob
//   - the only derived field is `cip_code`, lifted out of the description HTML
//
// Also prints diagnostic tallies after parsing:
//   - count of every distinct Program Type and Degree Type (all rows)
//   - the same tallies restricted to rows that have NO cip_code, so you can
//     see whether the missing-CIP rows are genuine non-major program types
//     (minors, requirements, licensures...) or actual majors.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); // Backend/data

const INPUT_PATH = path.join(__dirname, 'programs2026.csv');
const MISSING_PATH = path.join(__dirname, 'programs2026_missing_cip.csv');
const OUTPUT_DIR = __dirname;
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'programs2026.json');

function extractCipCode(descriptionHtml) {
  if (!descriptionHtml) return null;
  const m = descriptionHtml.match(/CIP\s*Code:?\s*(\d{2}\.\d{4})/i);
  return m ? m[1] : null;
}

// tally a list of programs by a given column -> { value: count }, sorted desc
function tallyBy(list, column) {
  const counts = new Map();
  for (const p of list) {
    const key = (p[column] ?? '').trim() || '(empty)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function printTally(label, entries) {
  console.log(`\n${label}`);
  for (const [value, count] of entries) {
    console.log(`  ${count.toString().padStart(4)}  ${value}`);
  }
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input not found: ${INPUT_PATH}`);
    console.error('Place the Programs export there and re-run.');
    process.exit(1);
  }

  let raw = fs.readFileSync(INPUT_PATH, 'utf8');
  raw = raw.replace(/^\uFEFF/, '');

  const rows = parse(raw, {
    columns: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: false,
  });

  const programs = rows.map((row) => ({
    ...row,
    cip_code: extractCipCode(row['Program Description'] ?? ''),
  }));

  const withCip = programs.filter((p) => p.cip_code);
  const withoutCip = programs.filter((p) => !p.cip_code);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(programs, null, 2));

  const escape = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const missingCsv = [
    'Program OID,Program Name,Program Type,Degree Type,Description snippet',
    ...withoutCip.map((p) =>
      [
        escape(p['Program OID']),
        escape(p['Program Name']),
        escape(p['Program Type']),
        escape(p['Degree Type']),
        escape(String(p['Program Description'] ?? '').replace(/\s+/g, ' ').slice(0, 200)),
      ].join(',')
    ),
  ].join('\n');
  fs.writeFileSync(MISSING_PATH, missingCsv);

  // --- summary ---
  console.log(`Parsed ${programs.length} program rows.`);
  console.log(`CIP code found on ${withCip.length}/${programs.length} rows.`);
  console.log(`No CIP on ${withoutCip.length} rows -> ${MISSING_PATH}`);

  printTally('Program Type — ALL rows:', tallyBy(programs, 'Program Type'));
  printTally('Degree Type — ALL rows:', tallyBy(programs, 'Degree Type'));
  printTally('Program Type — NO-CIP rows only:', tallyBy(withoutCip, 'Program Type'));
  printTally('Degree Type — NO-CIP rows only:', tallyBy(withoutCip, 'Degree Type'));

  console.log(`\nWrote ${OUTPUT_PATH}`);
}

main();