// Minimal CSV read/write helpers.
//
// Parsing uses csv-parse (already a dependency, and the MSU exports contain
// embedded newlines and quoted HTML that hand-rolled splitting cannot survive).
// Writing is done here rather than adding csv-stringify: the files we emit are
// small and flat, so the quoting rules fit in a few lines.

import fs from 'fs';
import { parse } from 'csv-parse/sync';

/** Parse a CSV file to an array of row objects. Strips a UTF-8 BOM if present. */
export function readCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '');
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  });
}

/** Parse a CSV file, returning [] if it does not exist yet. */
export function readCsvIfExists(filePath) {
  return fs.existsSync(filePath) ? readCsv(filePath) : [];
}

function escapeCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serialize rows to CSV text using the given column order.
 * Always writes \n line endings so output is byte-stable across platforms —
 * the importer is required to be idempotent and this repo is worked on from
 * both Windows and CI.
 */
export function toCsv(columns, rows) {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(row[c])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/** Write rows to a CSV file. */
export function writeCsv(filePath, columns, rows) {
  fs.writeFileSync(filePath, toCsv(columns, rows));
}

/** Write an object as pretty JSON with a trailing newline. */
export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
