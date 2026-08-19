// Text helpers shared by the catalog importer and the interactive resolver.
//
// Two jobs:
//   normalizeProgramName() - collapses catalog and legacy names to a comparable
//     form, so "Chemistry Major, B.S." and "Chemistry" land on the same key.
//   similarity()           - Dice coefficient over character trigrams, used to
//     rank candidates in the resolver. Implemented here rather than pulled from
//     a package so the tool keeps csv-parse as its only dependency; a
//     maintainer should be able to clone and run without a lockfile surprise.

/**
 * Collapse a program name to a comparison key.
 *
 * Strips, in order: parentheticals ("(AAM)"), a trailing degree suffix
 * ("Major, B.S.", "B.F.A.", "B.S.N."), the standalone word "Major"/"Minor",
 * then all punctuation. Case-insensitive.
 *
 * The degree-suffix pattern deliberately covers B.F.A./B.S.N./B.M.E. — an
 * earlier version only handled B.S./B.A./B.M. and silently failed to match
 * "Communication Design Major, B.F.A.".
 */
export function normalizeProgramName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    // trailing degree designator, with or without periods/spaces
    .replace(/,?\s*b\.?\s*[a-z]\.?\s*[a-z]?\.?\s*$/i, ' ')
    .replace(/,?\s*(bachelor|master)\s+of\s+.*$/i, ' ')
    .replace(/\b(major|minor)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * A human-friendly label for a program, preserving capitalization.
 * "Accounting Major, B.S." -> "Accounting". Used for the `major_name` field the
 * frontend already renders, so the UI text does not regress to catalog-speak.
 */
export function displayProgramName(name) {
  if (!name) return '';
  return String(name)
    .replace(/,?\s*b\.?\s*[a-z]\.?\s*[a-z]?\.?\s*$/i, '')
    .replace(/\s*\bMajor\b\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,\-]+$/, '')
    .trim();
}

/** Catalog rows that are cross-reference stubs, not real programs. */
export function isCrossReferenceStub(name) {
  return /\s-\s*see\s/i.test(String(name ?? ''));
}

function trigrams(value) {
  const s = `  ${String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}  `;
  const out = new Set();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

/**
 * Sorensen-Dice coefficient over character trigrams. Returns 0..1.
 * Tolerant of word reordering and small spelling drift, which is what the
 * resolver needs when a program has been renamed rather than retired.
 */
export function similarity(a, b) {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return (2 * shared) / (A.size + B.size);
}
