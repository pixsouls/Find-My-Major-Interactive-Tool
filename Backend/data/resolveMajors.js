// resolveMajors.js - the interactive half of the pipeline.
//
//   npm run catalog:resolve
//
// CLI only. Everything else in this pipeline is automatic; this is the one
// place a human is asked a question, and it only asks about things the
// automatic pass genuinely cannot decide:
//
//   1. legacy major names the seed could not match to a catalog major
//   2. CIPs in the mapping that have vanished from the current catalog
//
// Every answer is recorded in mapping/decisions.csv, so a question is never
// asked twice. In a steady-state year this exits immediately with nothing to do.
//
// Deliberately non-obvious choices:
//   - candidates are ranked across EVERY program type, not just majors, and
//     labelled with their type. Several programs (Lifestyle Medicine,
//     Integrative Health Care) were demoted from major to minor between
//     catalogs; if we only listed majors those would look like plain misses and
//     someone would map a career to the wrong thing.
//   - "retire" is a first-class answer. Not every unresolved name has a right
//     answer; Film Studies and Production simply no longer exists.

import fs from 'fs';
import readline from 'readline/promises';
import { stdin, stdout } from 'process';
import { readCsv } from './lib/csv.js';
import { discoverInputs, loadPrograms } from './lib/catalog.js';
import { similarity, normalizeProgramName } from './lib/text.js';
import {
  readSocToCip,
  writeSocToCip,
  readOverrides,
  writeOverrides,
  readDecisions,
  writeDecisions,
  readUnresolved,
  writeUnresolved,
} from './lib/mapping.js';
import { INPUT_DIR, LEGACY_MAPPING } from './lib/paths.js';

const CANDIDATE_COUNT = 6;
const today = () => new Date().toISOString().slice(0, 10);

function shortType(programType) {
  if (/Majors/i.test(programType)) return 'Major';
  if (/Minors/i.test(programType)) return 'Minor';
  if (/Certificate/i.test(programType)) return 'Cert';
  if (/Licensure|Endorsement/i.test(programType)) return 'Licensure';
  return programType.slice(0, 12) || '?';
}

function rank(query, programs) {
  return programs
    .map((p) => ({ program: p, score: similarity(query, p.program_name) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CANDIDATE_COUNT);
}

function printCandidates(candidates) {
  candidates.forEach(({ program, score }, i) => {
    const name = program.program_name.padEnd(52).slice(0, 52);
    const type = `[${shortType(program.program_type)}]`.padEnd(11);
    const cip = (program.cip_code ?? 'no CIP').padEnd(8);
    console.log(`   ${i + 1}  ${name} ${type} ${cip} ${score.toFixed(2)}`);
  });
}

async function main() {
  const unresolved = readUnresolved();
  const { rows: decisionRows, byName: decisionsByName } = readDecisions();
  const socRows = readSocToCip();

  const { programsPath } = discoverInputs(INPUT_DIR);
  const { byNormName: overrideIndex } = readOverrides();
  const { programs } = loadPrograms(programsPath, overrideIndex);
  const selectable = programs.filter((p) => !p.is_stub);
  const catalogCips = new Set(programs.filter((p) => p.cip_code).map((p) => p.cip_code));

  // worklist 1: legacy names with no recorded decision
  const pendingNames = unresolved.filter((u) => !decisionsByName.has(u.legacy_name));

  // worklist 2: mapped CIPs that no longer exist in this catalog
  const retiredCips = [...new Set(socRows.map((r) => (r.cip_code ?? '').trim()))]
    .filter((c) => c && !catalogCips.has(c))
    .filter((c) => !decisionsByName.has(`cip:${c}`))
    .sort();

  const total = pendingNames.length + retiredCips.length;

  if (total === 0) {
    console.log('Nothing to resolve. Every mapping entry points at a program in the current catalog.');
    return;
  }

  if (!stdin.isTTY) {
    // An interactive tool that blocks a CI job or a Render build is worse than
    // no tool, so refuse to prompt and report instead.
    console.error(`${total} item(s) need a human decision, but stdin is not a TTY.`);
    for (const u of pendingNames) console.error(`  - ${u.legacy_name}: ${u.reason}`);
    for (const c of retiredCips) console.error(`  - CIP ${c}: no longer in the catalog`);
    console.error('\nRun `npm run catalog:resolve` in a terminal.');
    process.exit(1);
  }

  const legacyRows = fs.existsSync(LEGACY_MAPPING) ? readCsv(LEGACY_MAPPING) : [];
  const rl = readline.createInterface({ input: stdin, output: stdout });

  const newSocRows = [...socRows];
  const { rows: overrideRows } = readOverrides();
  const newOverrides = [...overrideRows];
  const newDecisions = [...decisionRows];
  const resolvedNames = new Set();
  let index = 0;
  let quit = false;

  const record = (name, ruling, cip, qualifier, note) => {
    newDecisions.push({
      legacy_name: name,
      ruling,
      cip_code: cip ?? '',
      qualifier: qualifier ?? '',
      decided_on: today(),
      note: note ?? '',
    });
  };

  /** Ask for a CIP when the chosen program has none of its own. */
  const askForCip = async (program) => {
    console.log(`\n   "${program.program_name}" has no CIP in the catalog.`);
    const answer = (await rl.question('   Enter a CIP code (nn.nnnn), or [s]kip: ')).trim();
    if (!/^\d{2}\.\d{4}$/.test(answer)) return null;
    newOverrides.push({
      program_name: program.program_name,
      cip_code: answer,
      note: `added via catalog:resolve ${today()}`,
    });
    return answer;
  };

  // ---- worklist 1: unresolved legacy names ----
  for (const item of pendingNames) {
    if (quit) break;
    index++;
    console.log(`\n${'-'.repeat(64)}`);
    console.log(`Unresolved ${index}/${total}:  "${item.legacy_name}"`);
    console.log(`   ${item.reason}`);
    console.log(`   affects ${item.mapping_rows} mapping rows across ${item.careers} careers\n`);

    const candidates = rank(item.legacy_name, selectable);
    printCandidates(candidates);

    const answer = (
      await rl.question(`\n   [1-${candidates.length}] pick   [c] enter CIP   [r] retire   [s] skip   [q] save+quit  > `)
    ).trim().toLowerCase();

    if (answer === 'q') { quit = true; break; }
    if (answer === 's' || answer === '') { console.log('   skipped'); continue; }

    let cip = null;
    let qualifier = '';
    let note = '';

    if (answer === 'r') {
      record(item.legacy_name, 'retired', '', '', 'no longer offered');
      resolvedNames.add(item.legacy_name);
      console.log('   retired - will not be asked again');
      continue;
    }

    if (answer === 'c') {
      const typed = (await rl.question('   CIP code (nn.nnnn): ')).trim();
      if (!/^\d{2}\.\d{4}$/.test(typed)) { console.log('   not a CIP code, skipping'); continue; }
      cip = typed;
      note = 'CIP entered manually';
    } else {
      const pick = candidates[Number(answer) - 1];
      if (!pick) { console.log('   no such option, skipping'); continue; }
      const program = pick.program;
      cip = program.cip_code ?? (await askForCip(program));
      if (!cip) { console.log('   no CIP, skipping'); continue; }

      // qualify only when this CIP holds differently-named programs
      const sharing = programs.filter((p) => p.cip_code === cip && !p.is_stub);
      const distinct = new Set(sharing.map((p) => p.normalized_name));
      if (distinct.size > 1) qualifier = program.program_name;
      note = `resolved to "${program.program_name}"`;
      if (shortType(program.program_type) !== 'Major') {
        note += ` (${shortType(program.program_type)}, not a major)`;
        console.log(`   note: that is a ${shortType(program.program_type)}, not a major.`);
      }
    }

    // expand the ruling across every career the legacy name served
    const affected = legacyRows.filter((r) => r.major_name === item.legacy_name);
    let added = 0;
    for (const r of affected) {
      const dupe = newSocRows.some(
        (x) => x.onetsoc_code === r.onetsoc_code && x.cip_code === cip && (x.qualifier ?? '') === qualifier
      );
      if (dupe) continue;
      newSocRows.push({
        onetsoc_code: r.onetsoc_code,
        cip_code: cip,
        match_strength: r.match_strength,
        qualifier,
        note: `resolved from "${item.legacy_name}"`,
      });
      added++;
    }

    record(item.legacy_name, 'mapped', cip, qualifier, note);
    resolvedNames.add(item.legacy_name);
    console.log(`   mapped to CIP ${cip}${qualifier ? ` (qualified)` : ''} - ${added} rows added`);
  }

  // ---- worklist 2: retired CIPs ----
  for (const cip of retiredCips) {
    if (quit) break;
    index++;
    const affected = newSocRows.filter((r) => r.cip_code === cip);
    const wasCalled = affected[0]?.note ?? '';
    console.log(`\n${'-'.repeat(64)}`);
    console.log(`Unresolved ${index}/${total}:  CIP ${cip} is no longer in the catalog`);
    console.log(`   ${wasCalled}`);
    console.log(`   affects ${affected.length} mapping rows\n`);

    const query = wasCalled.replace(/^.*?"(.*)".*$/, '$1') || cip;
    const candidates = rank(query, selectable);
    printCandidates(candidates);

    const answer = (
      await rl.question(`\n   [1-${candidates.length}] re-point   [r] drop these rows   [s] skip   [q] save+quit  > `)
    ).trim().toLowerCase();

    if (answer === 'q') { quit = true; break; }
    if (answer === 's' || answer === '') { console.log('   skipped'); continue; }

    if (answer === 'r') {
      for (let i = newSocRows.length - 1; i >= 0; i--) {
        if (newSocRows[i].cip_code === cip) newSocRows.splice(i, 1);
      }
      record(`cip:${cip}`, 'dropped', cip, '', `${affected.length} rows removed`);
      console.log(`   dropped ${affected.length} rows`);
      continue;
    }

    const pick = candidates[Number(answer) - 1];
    if (!pick) { console.log('   no such option, skipping'); continue; }
    const newCip = pick.program.cip_code ?? (await askForCip(pick.program));
    if (!newCip) { console.log('   no CIP, skipping'); continue; }

    for (const row of newSocRows) {
      if (row.cip_code === cip) {
        row.cip_code = newCip;
        row.note = `re-pointed from retired CIP ${cip}`;
      }
    }
    record(`cip:${cip}`, 're-pointed', newCip, '', `to "${pick.program.program_name}"`);
    console.log(`   re-pointed ${affected.length} rows to CIP ${newCip}`);
  }

  rl.close();

  writeSocToCip(newSocRows);
  writeOverrides(newOverrides);
  writeDecisions(newDecisions);
  writeUnresolved(unresolved.filter((u) => !resolvedNames.has(u.legacy_name)));

  const remaining = total - newDecisions.length + decisionRows.length;
  console.log(`\n${'-'.repeat(64)}`);
  console.log('Saved mapping/socToCip.csv, cipOverrides.csv, decisions.csv, unresolved.csv');
  if (remaining > 0) console.log(`${remaining} item(s) still outstanding - re-run any time.`);
  console.log('Next: npm run catalog:import');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
