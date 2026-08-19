// seedMapping.js - one-time conversion of the legacy name-keyed mapping into
// the durable CIP-keyed mapping.
//
//   node data/seedMapping.js          preview only
//   node data/seedMapping.js --write  write mapping/socToCip.csv + unresolved.csv
//
// Why this exists: career_to_major_mapping.csv holds the curated career->major
// judgement, which is the most valuable data in the repo. It is keyed on free
// text, which is exactly why the old chain broke. This re-keys that judgement
// onto CIP codes - a national standard MSU does not re-issue - so it never has
// to be rebuilt again. Run once; after that the importer joins automatically.
//
// The qualifier rule (see the plan) is the whole trick:
//   - every program on that CIP shares one normalized name -> blank qualifier,
//     because they are degree variants and both should surface
//   - the CIP also holds a differently-named program -> write a qualifier,
//     because they are distinct programs and the distinction must survive

import fs from 'fs';
import { readCsv } from './lib/csv.js';
import { discoverInputs, loadPrograms, selectMajors, indexByCip, indexByNormalizedName } from './lib/catalog.js';
import { normalizeProgramName } from './lib/text.js';
import { readOverrides, writeSocToCip, writeUnresolved } from './lib/mapping.js';
import { INPUT_DIR, LEGACY_MAPPING } from './lib/paths.js';

const WRITE = process.argv.includes('--write');

function main() {
  if (!fs.existsSync(LEGACY_MAPPING)) {
    console.error(`Legacy mapping not found: ${LEGACY_MAPPING}`);
    process.exit(1);
  }

  const { programsPath } = discoverInputs(INPUT_DIR);
  const { byNormName: overrides } = readOverrides();
  const { programs } = loadPrograms(programsPath, overrides);
  const majors = selectMajors(programs);
  const byCip = indexByCip(majors);
  const byName = indexByNormalizedName(majors);

  console.log(`Programs export : ${programsPath}`);
  console.log(`Majors          : ${majors.length}`);

  const legacyRows = readCsv(LEGACY_MAPPING);
  const legacyNames = [...new Set(legacyRows.map((r) => r.major_name).filter(Boolean))];

  // context for the resolver: how much each unresolved name actually costs us
  const rowsPerName = new Map();
  const careersPerName = new Map();
  for (const r of legacyRows) {
    if (!r.major_name) continue;
    rowsPerName.set(r.major_name, (rowsPerName.get(r.major_name) ?? 0) + 1);
    if (!careersPerName.has(r.major_name)) careersPerName.set(r.major_name, new Set());
    careersPerName.get(r.major_name).add(r.onetsoc_code);
  }

  const resolution = new Map(); // legacy name -> { cip_code, qualifier }
  const unresolved = [];
  let blankCount = 0;
  let qualifiedCount = 0;

  for (const name of legacyNames) {
    const matches = byName.get(normalizeProgramName(name));

    if (!matches || matches.length === 0) {
      unresolved.push({ legacy_name: name, reason: 'no name match in catalog' });
      continue;
    }

    const cip = matches.find((m) => m.cip_code)?.cip_code ?? null;
    if (!cip) {
      unresolved.push({
        legacy_name: name,
        reason: `matched "${matches[0].program_name}" but it has no CIP`,
      });
      continue;
    }

    const sharing = byCip.get(cip) ?? [];
    const distinctNames = new Set(sharing.map((m) => m.normalized_name));

    if (distinctNames.size <= 1) {
      resolution.set(name, { cip_code: cip, qualifier: '' });
      blankCount++;
    } else {
      resolution.set(name, {
        cip_code: cip,
        qualifier: matches.map((m) => m.program_name).join('|'),
      });
      qualifiedCount++;
    }
  }

  // expand back out to one row per (career, cip, qualifier)
  const seen = new Set();
  const socRows = [];
  for (const r of legacyRows) {
    const res = resolution.get(r.major_name);
    if (!res) continue;
    const key = `${r.onetsoc_code}|${res.cip_code}|${res.qualifier}`;
    if (seen.has(key)) continue;
    seen.add(key);
    socRows.push({
      onetsoc_code: r.onetsoc_code,
      cip_code: res.cip_code,
      match_strength: r.match_strength,
      qualifier: res.qualifier,
      note: res.qualifier ? `seeded from "${r.major_name}"; CIP shared` : `seeded from "${r.major_name}"`,
    });
  }

  const unresolvedRows = unresolved.map((u) => ({
    ...u,
    mapping_rows: rowsPerName.get(u.legacy_name) ?? 0,
    careers: careersPerName.get(u.legacy_name)?.size ?? 0,
  }));

  console.log(`\nLegacy distinct names : ${legacyNames.length}`);
  console.log(`  auto, blank qualifier : ${blankCount}`);
  console.log(`  auto, qualified       : ${qualifiedCount}`);
  console.log(`  unresolved            : ${unresolvedRows.length}`);
  console.log(`\nsocToCip rows to write : ${socRows.length}`);

  if (unresolvedRows.length) {
    console.log('\nUnresolved (run `npm run catalog:resolve` to settle these):');
    for (const u of unresolvedRows) {
      console.log(`  ${u.legacy_name}  -  ${u.reason}  [${u.mapping_rows} rows, ${u.careers} careers]`);
    }
  }

  if (!WRITE) {
    console.log('\nPreview only. Re-run with --write to save.');
    return;
  }

  writeSocToCip(socRows);
  writeUnresolved(unresolvedRows);
  console.log('\nWrote mapping/socToCip.csv and mapping/unresolved.csv');
}

main();
