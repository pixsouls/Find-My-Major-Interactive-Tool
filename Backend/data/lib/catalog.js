// Loading and shaping the official MSU catalog exports.
//
// READ-ONLY DATA RULE: everything here reads the MSU exports and returns new
// objects. Nothing in this file writes to an MSU-provided path.
//
// The exports are catalog-scoped (Catalog OID 59 = 2026-2027). Program OID is
// the correct key for joining courses to programs *within a run*, but it is
// never persisted as a link — see the plan's "persist only nationally-standard
// keys" principle. cip_code is the durable bridge.

import fs from 'fs';
import path from 'path';
import { readCsv } from './csv.js';
import { normalizeProgramName, isCrossReferenceStub } from './text.js';

const PROGRAM_REQUIRED = ['Program OID', 'Program Name', 'Program Type', 'Program Description'];
const COURSE_REQUIRED = ['Program OIDs', 'Prefix', 'Code', 'Name'];

export const MAJOR_PROGRAM_TYPE = 'Undergraduate Majors';

/**
 * Find the newest export of each kind in `dir`.
 *
 * Candidates are matched loosely by filename and then *confirmed by their
 * header row*, which is what keeps `programs2026_missing_cip.csv` (a generated
 * artifact that also starts with "programs") from being mistaken for an input.
 * The maintainer drops in next year's files under whatever name MSU gives them
 * and this still resolves — no code edit, which is the entire point.
 */
export function discoverInputs(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv'));

  const pick = (namePattern, required, label) => {
    const matches = [];
    for (const f of files) {
      if (!namePattern.test(f)) continue;
      const full = path.join(dir, f);
      let header;
      try {
        header = Object.keys(readCsv(full)[0] ?? {});
      } catch {
        continue; // unparseable - not our file
      }
      if (required.every((c) => header.includes(c))) {
        matches.push({ file: full, mtime: fs.statSync(full).mtimeMs });
      }
    }
    if (matches.length === 0) {
      throw new Error(
        `No ${label} export found in ${dir}. Expected a .csv containing the columns: ${required.join(', ')}`
      );
    }
    matches.sort((a, b) => b.mtime - a.mtime);
    return matches[0].file;
  };

  return {
    programsPath: pick(/program/i, PROGRAM_REQUIRED, 'Programs'),
    coursesPath: pick(/course/i, COURSE_REQUIRED, 'Courses'),
  };
}

/**
 * Pull the CIP code out of a program's description HTML.
 * MSU embeds it as free text ("CIP Code: 52.0301") rather than giving it a
 * column, so this is a regex against a template we do not control. The importer
 * asserts on overall coverage precisely because this can break silently.
 */
export function extractCipCode(descriptionHtml) {
  if (!descriptionHtml) return null;
  const m = String(descriptionHtml).match(/CIP\s*Code:?\s*(\d{2}\.\d{4})/i);
  return m ? m[1] : null;
}

/**
 * Load every program row, with cip_code derived and name-based overrides
 * applied for the programs whose description carries no CIP.
 *
 * @param {string} programsPath
 * @param {Map<string,string>} overridesByNormName  normalized name -> cip_code
 */
export function loadPrograms(programsPath, overridesByNormName = new Map()) {
  const rows = readCsv(programsPath);
  const usedOverrides = new Set();

  const programs = rows.map((row) => {
    const name = row['Program Name'] ?? '';
    const normName = normalizeProgramName(name);
    let cip = extractCipCode(row['Program Description']);
    let cipSource = cip ? 'description' : null;

    if (!cip && overridesByNormName.has(normName)) {
      cip = overridesByNormName.get(normName);
      cipSource = 'override';
      usedOverrides.add(normName);
    }

    return {
      program_oid: String(row['Program OID'] ?? '').trim(),
      program_name: name,
      normalized_name: normName,
      program_type: (row['Program Type'] ?? '').trim(),
      degree_type: (row['Degree Type'] ?? '').trim(),
      department: (row['Entity Name'] ?? '').trim(),
      catalog_oid: String(row['Catalog OID'] ?? '').trim(),
      catalog_name: (row['Catalog Name'] ?? '').trim(),
      is_active: String(row['Is Active'] ?? '').trim(),
      pathways_occupation_group: (row['Pathways Occupation Group'] ?? '').trim(),
      cip_code: cip,
      cip_source: cipSource,
      is_stub: isCrossReferenceStub(name),
    };
  });

  return { programs, usedOverrides };
}

/**
 * The subset that may be recommended to a student as a major.
 *
 * Filters out the 105 minors, the certificates and licensure programs, the two
 * inactive non-program rows, and the "- See ..." cross-reference stub. Showing
 * a minor where the UI promises a major would be wrong.
 */
export function selectMajors(programs) {
  return programs.filter(
    (p) => p.program_type === MAJOR_PROGRAM_TYPE && p.is_active === '1' && !p.is_stub
  );
}

/**
 * Load courses and group them by the programs that use them.
 *
 * `Program OIDs` is a comma-separated list of foreign keys into the programs
 * export - a real join, no fuzzy matching. Courses are keyed in the output by
 * Prefix+Code ("AAS 1010"), which is stable across catalogs, rather than by the
 * catalog-scoped Course OID.
 *
 * @returns {Map<string, Array>} program_oid -> courses
 */
export function loadCoursesByProgram(coursesPath) {
  const rows = readCsv(coursesPath);
  const byProgram = new Map();

  for (const row of rows) {
    const oids = String(row['Program OIDs'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (oids.length === 0) continue;

    const course = {
      code: `${(row['Prefix'] ?? '').trim()} ${(row['Code'] ?? '').trim()}`.trim(),
      title: (row['Name'] ?? '').trim(),
      credits: (row['Credits:'] ?? '').trim(),
      department: (row['Department Name'] ?? '').trim(),
    };

    for (const oid of oids) {
      if (!byProgram.has(oid)) byProgram.set(oid, []);
      byProgram.get(oid).push(course);
    }
  }

  for (const list of byProgram.values()) {
    list.sort((a, b) => a.code.localeCompare(b.code));
  }
  return byProgram;
}

/** Group majors by cip_code. */
export function indexByCip(majors) {
  const byCip = new Map();
  for (const m of majors) {
    if (!m.cip_code) continue;
    if (!byCip.has(m.cip_code)) byCip.set(m.cip_code, []);
    byCip.get(m.cip_code).push(m);
  }
  return byCip;
}

/** Group majors by normalized name (degree variants collapse together). */
export function indexByNormalizedName(majors) {
  const byName = new Map();
  for (const m of majors) {
    if (!byName.has(m.normalized_name)) byName.set(m.normalized_name, []);
    byName.get(m.normalized_name).push(m);
  }
  return byName;
}
