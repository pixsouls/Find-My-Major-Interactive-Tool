// importCatalog.js - rebuild the generated data from the current MSU exports.
//
//   npm run catalog:import
//
// Non-interactive and CI-safe. Discovers the newest Programs/Courses exports by
// header inspection, joins them to the CIP mapping, writes data/generated/, and
// prints a reconciliation report naming everything a human still has to rule on.
//
// Idempotent: same inputs produce byte-identical outputs.
//
// READ-ONLY DATA RULE: the MSU exports are only ever read.

import fs from 'fs';
import path from 'path';
import { writeJson } from './lib/csv.js';
import {
  discoverInputs,
  loadPrograms,
  selectMajors,
  loadCoursesByProgram,
  indexByCip,
} from './lib/catalog.js';
import { displayProgramName, normalizeProgramName } from './lib/text.js';
import { readSocToCip, readOverrides, readUnresolved } from './lib/mapping.js';
import {
  INPUT_DIR,
  GENERATED_DIR,
  REPORTS_DIR,
  OUT_PROGRAMS,
  OUT_CAREER_MAJORS,
  ADAPTED_CAREERS,
  DATA_DIR,
} from './lib/paths.js';

const MIN_CIP_COVERAGE = 0.9; // below this, assume the description template changed
const MAX_CAREER_LOSS = 0.05; // careers losing majors vs the previous build

/** Split a qualifier cell ("A|B") into normalized names. */
function qualifierNames(qualifier) {
  return String(qualifier ?? '')
    .split('|')
    .map((s) => normalizeProgramName(s))
    .filter(Boolean);
}

function buildCareerMajors(socRows, byCip) {
  // career -> program_oid -> entry, so the strongest match wins on duplicates
  const perCareer = new Map();

  for (const row of socRows) {
    const soc = (row.onetsoc_code ?? '').trim();
    const cip = (row.cip_code ?? '').trim();
    if (!soc || !cip) continue;

    const candidates = byCip.get(cip);
    if (!candidates) continue;

    const wanted = qualifierNames(row.qualifier);
    const selected = wanted.length
      ? candidates.filter((m) => wanted.includes(m.normalized_name))
      : candidates;

    if (!perCareer.has(soc)) perCareer.set(soc, new Map());
    const bucket = perCareer.get(soc);

    for (const m of selected) {
      const strength = Number(row.match_strength ?? 0) || 0;
      const existing = bucket.get(m.program_oid);
      if (existing && existing.match_strength >= strength) continue;
      bucket.set(m.program_oid, {
        major_name: displayProgramName(m.program_name),
        match_strength: strength,
        // The catalog export carries no program webpage URL - the old value came
        // from the scraper, which is what sent 60 rows to /events/. Null until a
        // catalog deep-link pattern is confirmed; the UI already handles null.
        msu_url: null,
        program_name: m.program_name,
        degree_type: m.degree_type,
        department: m.department,
        cip_code: m.cip_code,
        courses: m.courses.map((c) => c.code),
      });
    }
  }

  const out = [];
  for (const [soc, bucket] of perCareer) {
    const entries = [...bucket.values()].sort(
      (a, b) => b.match_strength - a.match_strength || a.major_name.localeCompare(b.major_name)
    );
    for (const e of entries) out.push({ onetsoc_code: soc, ...e });
  }
  out.sort(
    (a, b) =>
      a.onetsoc_code.localeCompare(b.onetsoc_code) ||
      b.match_strength - a.match_strength ||
      a.major_name.localeCompare(b.major_name)
  );
  return out;
}

function readJsonIfExists(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const { programsPath, coursesPath } = discoverInputs(INPUT_DIR);
  const { byNormName: overrides, rows: overrideRows } = readOverrides();
  const { programs, usedOverrides } = loadPrograms(programsPath, overrides);
  const majors = selectMajors(programs);
  const coursesByProgram = loadCoursesByProgram(coursesPath);

  for (const p of programs) p.courses = coursesByProgram.get(p.program_oid) ?? [];

  const byCip = indexByCip(majors);
  const socRows = readSocToCip();
  const careerMajors = buildCareerMajors(socRows, byCip);

  // ---- write generated ----
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const previous = readJsonIfExists(OUT_CAREER_MAJORS);

  // ---- reconcile ----
  const catalogName = programs[0]?.catalog_name || 'unknown-catalog';
  const withCip = majors.filter((m) => m.cip_code);
  const coverage = majors.length ? withCip.length / majors.length : 0;
  const careersCovered = new Set(careerMajors.map((r) => r.onetsoc_code));

  const mappedCips = new Set(socRows.map((r) => (r.cip_code ?? '').trim()).filter(Boolean));
  const catalogCips = new Set(withCip.map((m) => m.cip_code));

  const retired = [...mappedCips].filter((c) => !catalogCips.has(c)).sort();
  const unreachable = majors
    .filter((m) => m.cip_code && !mappedCips.has(m.cip_code))
    .map((m) => m.program_name)
    .sort();
  const noCip = majors.filter((m) => !m.cip_code).map((m) => m.program_name).sort();
  const newlyShared = [...byCip.entries()]
    .filter(([, list]) => new Set(list.map((m) => m.normalized_name)).size > 1)
    .map(([cip, list]) => `${cip} - ${list.map((m) => m.program_name).join(' | ')}`)
    .sort();
  const staleOverrides = overrideRows
    .filter((r) => !usedOverrides.has(normalizeProgramName(r.program_name)))
    .map((r) => r.program_name);

  const adapted = readJsonIfExists(ADAPTED_CAREERS) ?? [];
  const adaptedSocs = new Set(adapted.map((c) => c.onetsoc_code));
  const deadCareers = [...new Set(socRows.map((r) => r.onetsoc_code))]
    .filter((s) => adaptedSocs.size > 0 && !adaptedSocs.has(s))
    .sort();

  const unresolved = readUnresolved();

  // Program OID drift - the check that validates the whole design choice.
  let oidDrift = 'no previous build to compare against';
  const prevPrograms = readJsonIfExists(OUT_PROGRAMS.replace(/programs\.json$/, 'programs.prev.json'));
  if (prevPrograms) {
    const prevByName = new Map(prevPrograms.map((p) => [p.normalized_name, p.program_oid]));
    const changed = programs.filter(
      (p) => prevByName.has(p.normalized_name) && prevByName.get(p.normalized_name) !== p.program_oid
    );
    oidDrift = changed.length
      ? `${changed.length} programs kept their name but changed Program OID - OIDs ARE re-issued per catalog. Never persist them.`
      : 'Program OIDs stable across these two catalogs.';
  }

  const lines = [];
  const section = (title, items, action) => {
    lines.push(`\n## ${title} (${items.length})`);
    if (action) lines.push(`_${action}_\n`);
    if (items.length === 0) lines.push('None.');
    else for (const i of items) lines.push(`- ${i}`);
  };

  lines.push(`# Catalog reconciliation - ${catalogName}`);
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}`);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Programs parsed | ${programs.length} |`);
  lines.push(`| Majors kept | ${majors.length} |`);
  lines.push(`| CIP coverage on majors | ${withCip.length}/${majors.length} (${(coverage * 100).toFixed(1)}%) |`);
  // coursesByProgram is keyed by every OID the courses export mentions, which
  // includes graduate/inactive programs absent from this export - count ours.
  const programsWithCourses = programs.filter((p) => p.courses.length > 0).length;
  lines.push(`| Programs with courses attached | ${programsWithCourses}/${programs.length} |`);
  lines.push(`| Careers with >=1 major | ${careersCovered.size} |`);
  lines.push(`| careerMajors rows | ${careerMajors.length} |`);
  lines.push(`| Program OID drift | ${oidDrift} |`);

  section('Unresolved legacy names', unresolved.map((u) => `${u.legacy_name} - ${u.reason} [${u.mapping_rows} rows]`), 'Run: npm run catalog:resolve');
  section('Retired CIPs', retired, 'In the mapping but no longer in the catalog. Run: npm run catalog:resolve');
  section('Unreachable majors', unreachable, 'Real majors no career maps to. Add rows to mapping/socToCip.csv, or accept.');
  section('Majors with no CIP', noCip, 'Add a row to mapping/cipOverrides.csv, or run: npm run catalog:resolve');
  section('Shared CIPs', newlyShared, 'Auto-qualified by the seed. Listed so a new clash is visible.');
  section('Stale overrides', staleOverrides, 'cipOverrides.csv names that matched nothing this run. Fix the name.');
  section('Dead careers', deadCareers, 'SOC codes in the mapping that adaptedCareers.json does not contain. Prune.');

  const reportPath = path.join(REPORTS_DIR, `reconcile-${catalogName.replace(/[^\w.-]+/g, '-')}.md`);
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);

  console.log(`Programs export : ${path.relative(DATA_DIR, programsPath)}`);
  console.log(`Courses export  : ${path.relative(DATA_DIR, coursesPath)}`);
  console.log(`Catalog         : ${catalogName}`);
  console.log(`Programs        : ${programs.length}  Majors: ${majors.length}`);
  console.log(`CIP coverage    : ${withCip.length}/${majors.length} (${(coverage * 100).toFixed(1)}%)`);
  console.log(`Careers covered : ${careersCovered.size}`);
  console.log(`careerMajors    : ${careerMajors.length} rows`);
  console.log(`Report          : ${path.relative(DATA_DIR, reportPath)}`);

  // ---- assertions: a silent empty result is the failure mode that matters ----
  const failures = [];
  if (coverage < MIN_CIP_COVERAGE) {
    failures.push(
      `CIP coverage on majors is ${(coverage * 100).toFixed(1)}%, below ${MIN_CIP_COVERAGE * 100}%. ` +
        'The "CIP Code:" pattern in Program Description has probably changed.'
    );
  }
  if (careerMajors.length === 0) {
    failures.push('No career->major rows produced at all.');
  }
  if (previous) {
    const before = new Set(previous.map((r) => r.onetsoc_code)).size;
    const after = careersCovered.size;
    if (before > 0 && (before - after) / before > MAX_CAREER_LOSS) {
      failures.push(
        `Careers with >=1 major fell from ${before} to ${after} ` +
          `(>${MAX_CAREER_LOSS * 100}% loss versus the previous build).`
      );
    }
  }

  // Write generated/ only after the assertions pass. A failed run must leave
  // the last good build in place - overwriting it with an empty mapping and
  // *then* reporting the failure would hand a broken deploy to whoever ignores
  // the exit code.
  if (failures.length) {
    console.error('\nFAILED - generated/ left untouched:');
    for (const f of failures) console.error(`  - ${f}`);
    console.error(`\nDiagnostics: ${path.relative(DATA_DIR, reportPath)}`);
    process.exit(1);
  }

  writeJson(OUT_PROGRAMS, [...programs].sort((a, b) => a.program_name.localeCompare(b.program_name)));
  writeJson(OUT_CAREER_MAJORS, careerMajors);
  console.log(`Wrote           : ${path.relative(DATA_DIR, OUT_CAREER_MAJORS)}`);

  if (unresolved.length) {
    console.log(`\n${unresolved.length} unresolved name(s). Run: npm run catalog:resolve`);
  }
}

main();
