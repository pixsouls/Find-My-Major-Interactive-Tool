import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const typesPath = path.resolve(__dirname, '../../Frontend/src/data/types.ts');
const VALID_TRAITS = ['R', 'I', 'A', 'S', 'E', 'C'];

function parseQuestionMappings() {
  const content = fs.readFileSync(typesPath, 'utf8');
  const pattern = /\{\s*id:\s*(\d+),\s*text:\s*"([^"]+)",\s*type:\s*"([RIASEC])"\s*\}/g;
  const rows = [];

  let match;
  while ((match = pattern.exec(content)) !== null) {
    rows.push({
      id: Number(match[1]),
      text: match[2],
      type: match[3],
    });
  }

  return rows;
}

test('types.ts contains valid question-to-trait mappings', () => {
  const mappings = parseQuestionMappings();

  assert.equal(mappings.length, 36, 'Expected 36 mapped questions');

  const ids = mappings.map((row) => row.id);
  assert.equal(new Set(ids).size, 36, 'Question IDs should be unique');

  for (let i = 1; i <= 36; i++) {
    assert.ok(ids.includes(i), `Missing question ID ${i}`);
  }

  const typeCounts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const row of mappings) {
    assert.ok(VALID_TRAITS.includes(row.type), `Invalid trait ${row.type} on question ${row.id}`);
    assert.ok(row.text.length > 0, `Question text is empty for ID ${row.id}`);
    typeCounts[row.type] += 1;
  }

  for (const trait of VALID_TRAITS) {
    assert.equal(typeCounts[trait], 6, `Expected 6 questions mapped to ${trait}`);
  }
});

test('types.ts keeps expected trait mapping for representative questions', () => {
  const mappings = parseQuestionMappings();
  const byId = new Map(mappings.map((row) => [row.id, row.type]));

  assert.equal(byId.get(1), 'R');
  assert.equal(byId.get(2), 'I');
  assert.equal(byId.get(3), 'A');
  assert.equal(byId.get(4), 'S');
  assert.equal(byId.get(5), 'E');
  assert.equal(byId.get(6), 'C');
  assert.equal(byId.get(31), 'R');
  assert.equal(byId.get(36), 'C');
});
