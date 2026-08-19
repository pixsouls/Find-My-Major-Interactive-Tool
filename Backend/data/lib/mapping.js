// Read/write for the human-owned mapping files.
//
// These four files are the only things a maintainer ever edits, and the only
// state that carries across catalog years. Every key in them is a national
// standard (O*NET SOC, NCES CIP) or a decision record - never a Program OID.

import fs from 'fs';
import { readCsvIfExists, writeCsv } from './csv.js';
import { normalizeProgramName } from './text.js';
import { SOC_TO_CIP, CIP_OVERRIDES, DECISIONS, UNRESOLVED, MAPPING_DIR } from './paths.js';

export const SOC_TO_CIP_COLUMNS = ['onetsoc_code', 'cip_code', 'match_strength', 'qualifier', 'note'];
export const OVERRIDE_COLUMNS = ['program_name', 'cip_code', 'note'];
export const DECISION_COLUMNS = ['legacy_name', 'ruling', 'cip_code', 'qualifier', 'decided_on', 'note'];
export const UNRESOLVED_COLUMNS = ['legacy_name', 'reason', 'mapping_rows', 'careers'];

export function ensureMappingDir() {
  fs.mkdirSync(MAPPING_DIR, { recursive: true });
}

export function readSocToCip() {
  return readCsvIfExists(SOC_TO_CIP);
}

export function writeSocToCip(rows) {
  ensureMappingDir();
  const sorted = [...rows].sort(
    (a, b) =>
      a.onetsoc_code.localeCompare(b.onetsoc_code) ||
      a.cip_code.localeCompare(b.cip_code) ||
      String(a.qualifier ?? '').localeCompare(String(b.qualifier ?? ''))
  );
  writeCsv(SOC_TO_CIP, SOC_TO_CIP_COLUMNS, sorted);
}

/** Overrides indexed by normalized program name, for the CIP-less majors. */
export function readOverrides() {
  const rows = readCsvIfExists(CIP_OVERRIDES);
  const byNormName = new Map();
  for (const r of rows) {
    if (!r.program_name || !r.cip_code) continue;
    byNormName.set(normalizeProgramName(r.program_name), r.cip_code.trim());
  }
  return { rows, byNormName };
}

export function writeOverrides(rows) {
  ensureMappingDir();
  const sorted = [...rows].sort((a, b) => a.program_name.localeCompare(b.program_name));
  writeCsv(CIP_OVERRIDES, OVERRIDE_COLUMNS, sorted);
}

/**
 * Every ruling a human has made, keyed by the legacy major name.
 * The resolver consults this first so a question is never asked twice - that is
 * what keeps the yearly run short.
 */
export function readDecisions() {
  const rows = readCsvIfExists(DECISIONS);
  const byName = new Map();
  for (const r of rows) if (r.legacy_name) byName.set(r.legacy_name, r);
  return { rows, byName };
}

export function writeDecisions(rows) {
  ensureMappingDir();
  const sorted = [...rows].sort((a, b) => a.legacy_name.localeCompare(b.legacy_name));
  writeCsv(DECISIONS, DECISION_COLUMNS, sorted);
}

export function readUnresolved() {
  return readCsvIfExists(UNRESOLVED);
}

export function writeUnresolved(rows) {
  ensureMappingDir();
  const sorted = [...rows].sort((a, b) => a.legacy_name.localeCompare(b.legacy_name));
  writeCsv(UNRESOLVED, UNRESOLVED_COLUMNS, sorted);
}
