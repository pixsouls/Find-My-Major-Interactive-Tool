import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_DIR = path.join(__dirname, 'raw');
const OUT_DIR = path.join(__dirname, 'src');

// maps O*NET interest element_ids to RIASEC letters
const RIASEC_MAP = {
  '1.B.1.a': 'R', '1.B.1.b': 'I', '1.B.1.c': 'A',
  '1.B.1.d': 'S', '1.B.1.e': 'E', '1.B.1.f': 'C',
};

// parse the comma-separated values inside a single VALUES (...) clause,
// respecting single-quoted strings and SQL's '' escaped-quote convention
function parseValues(str) {
  const out = [];
  let i = 0;
  while (i < str.length) {
    while (i < str.length && (str[i] === ' ' || str[i] === ',')) i++;
    if (i >= str.length) break;
    if (str[i] === "'") {
      i++;
      let s = '';
      while (i < str.length) {
        if (str[i] === "'" && str[i + 1] === "'") { s += "'"; i += 2; }
        else if (str[i] === "'") { i++; break; }
        else { s += str[i]; i++; }
      }
      out.push(s);
    } else {
      let v = '';
      while (i < str.length && str[i] !== ',') { v += str[i]; i++; }
      v = v.trim();
      out.push(v === 'NULL' ? null : v);
    }
  }
  return out;
}

// extract every INSERT row from a .sql file (one INSERT per line)
function parseInserts(sql) {
  const rows = [];
  for (const line of sql.split('\n')) {
    if (!line.trim().toUpperCase().startsWith('INSERT')) continue;
    const m = line.match(/VALUES\s*\((.*)\)\s*;?\s*$/i);
    if (m) rows.push(parseValues(m[1]));
  }
  return rows;
}

// fuzzy-match a major name to an MSU program URL by word overlap
function makeMatcher(msuPrograms) {
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  return function findMsuUrl(majorName) {
    const majorWords = new Set(normalize(majorName));
    let best = null, bestScore = 0;
    for (const p of msuPrograms) {
      const words = normalize(p.title);
      const overlap = words.filter(w => majorWords.has(w)).length;
      const score = overlap / Math.max(majorWords.size, words.length);
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return bestScore >= 0.5 ? best.url : null;
  };
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. occupation_data → {onetsoc_code, title, description}
  const occSql = fs.readFileSync(path.join(RAW_DIR, '03_occupation_data.sql'), 'utf8');
  const occupations = parseInserts(occSql).map(([onetsoc_code, title, description]) => ({
    onetsoc_code, title, description,
  }));
  const occByCode = new Map(occupations.map(o => [o.onetsoc_code, o]));
  console.log(`Parsed ${occupations.length} occupations`);

  // 2. interests → keep raw for /api/jobs, and pivot for adaptedCareers
  const intSql = fs.readFileSync(path.join(RAW_DIR, '13_interests.sql'), 'utf8');
  const interests = parseInserts(intSql).map(
    ([onetsoc_code, element_id, scale_id, data_value, date_updated, domain_source]) => ({
      onetsoc_code, element_id, scale_id,
      data_value: parseFloat(data_value),
      date_updated, domain_source,
    })
  );
  fs.writeFileSync(path.join(OUT_DIR, 'interests.json'), JSON.stringify(interests));
  console.log(`Parsed ${interests.length} interest rows`);

  // 3. PIVOT: tall interests → one wide row per career with R..C columns,
  //    joined with occupation_data for title + description (inner join,
  //    same as the old AdaptedCareers INSERT...SELECT)
  const pivot = new Map(); // onetsoc_code -> {R,I,A,S,E,C}
  for (const row of interests) {
    const letter = RIASEC_MAP[row.element_id];
    if (!letter) continue;
    if (!pivot.has(row.onetsoc_code)) {
      pivot.set(row.onetsoc_code, { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });
    }
    const rec = pivot.get(row.onetsoc_code);
    rec[letter] = Math.max(rec[letter], row.data_value); // MAX, matching the SQL
  }

  const adaptedCareers = [];
  for (const [code, scores] of pivot) {
    const occ = occByCode.get(code);
    if (!occ) continue; // inner join: skip careers with no occupation_data
    adaptedCareers.push({
      onetsoc_code: code,
      title: occ.title,
      description: occ.description,
      ...scores,
    });
  }
  fs.writeFileSync(path.join(OUT_DIR, 'adaptedCareers.json'), JSON.stringify(adaptedCareers));
  console.log(`Built ${adaptedCareers.length} adapted careers`);

  // 4. career_majors with msu_url fuzzy-matched in
  const msuPrograms = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'msu_programs.json'), 'utf8'));
  const findMsuUrl = makeMatcher(msuPrograms);

  const csv = fs.readFileSync(path.join(RAW_DIR, 'career_to_major_mapping.csv'), 'utf8');
  const lines = csv.split('\n').filter(l => l.trim());
  const careerMajors = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 3) { skipped++; continue; }
    const [major_name, onetsoc_code, match_strength] = cols.map(c => c.trim());
    // drop rows whose career isn't in occupation_data (old FK behavior)
    if (!occByCode.has(onetsoc_code)) { skipped++; continue; }
    careerMajors.push({
      major_name,
      onetsoc_code,
      match_strength: parseFloat(match_strength),
      msu_url: findMsuUrl(major_name),
    });
  }
  fs.writeFileSync(path.join(OUT_DIR, 'careerMajors.json'), JSON.stringify(careerMajors));
  console.log(`Built ${careerMajors.length} career-major links (${skipped} skipped)`);

  console.log('Done. JSON written to Backend/src/');
}

main();