# Find My Major — Project Hand-off

The entry point for anyone (human or Claude Code) picking this project up.
Keep it current: if you move a file or change a route, fix it here in the same
commit.

---

## What this project is

**Find My Major** (team name: Wayfinder) — a RIASEC / Holland Code career
assessment web app for MSU Denver. A user takes an adaptive quiz, gets a Holland
code, and is shown recommended careers and the MSU majors that map to them.

Repo: `Find-My-Major-Interactive-Tool`

- `Frontend/` — React 19 + TypeScript + Vite (deployed on Vercel)
- `Backend/` — Node + Express 5, ESM (deployed on Render)

---

## ⛔ READ-ONLY DATA RULE (do not violate)

**The original data files provided by MSU Denver and O\*NET are READ-ONLY.**

- You may **read** and **parse** the raw exports.
- You may **port / transform** them into new derived files.
- You may **NOT edit, overwrite, reformat, "clean up," or delete** the original
  source files in place. Ever.

The originals that must stay untouched live in `Backend/data/` and include at
least:

| File | What it is |
|---|---|
| `programs2026.csv` | MSU catalog "Programs" export (Dataset 1) |
| `courses-list-2026-07-16_10.49.16.csv` | MSU catalog "Courses" export (Dataset 2) |
| `03_occupation_data.sql` | O\*NET occupation seed |
| `13_interests.sql` | O\*NET interests seed |
| `career_to_major_mapping.csv` | Career↔major mapping input |

The correct pattern is **read original → write a NEW file.** The converter reads
`Backend/data/programs2026.csv` and writes a separate
`Backend/data/programs2026.json`; the source CSV is never modified.

If a transform seems to require changing the source, it does not — write the
change into the derived/output file, or into an intermediate file. When in
doubt, treat anything received directly from MSU or O\*NET as immutable input.

The one file the app itself writes is `Backend/data/collected.csv`, which is
append-only output, not source data.

---

## Current architecture

**The backend is database-free.** It was migrated off PostgreSQL; it now loads
read-only seed data into RAM at boot from JSON files in `Backend/data/`:

| File | Contents |
|---|---|
| `adaptedCareers.json` | Careers pivoted to wide RIASEC columns (R…C) |
| `interests.json` | Raw O\*NET interest rows |
| `careerMajors.json` | Career↔major links (currently name/URL based) |

`Backend/src/server.js` pre-indexes these into `Map`s keyed by `onetsoc_code` at
startup so lookups are O(1), and logs the row counts and approximate memory use.

These JSON files are produced by **manual converter scripts** — run by hand when
new data arrives, never at server start:

| Script | Reads | Writes |
|---|---|---|
| `Backend/sqlToJson.js` | the O\*NET `.sql` seeds, `msu_programs.json`, `career_to_major_mapping.csv` | `adaptedCareers.json`, `interests.json`, `careerMajors.json` |
| `Backend/data/csvToJSON.js` | `programs2026.csv` | `programs2026.json`, `programs2026_missing_cip.csv` |

Both write into `Backend/data/`. (`csvToJSON.js` calls itself `csvToPrograms.js`
in its own header comment — same file, the name was never updated.)

The only thing the running server **writes** is collected quiz scores, appended
to `Backend/data/collected.csv` (created on startup if missing). An in-memory
`Map` keyed by `session_id` holds one logical record per session for the current
run; every update is also appended to the CSV, so a restart never loses data.

### Routes (`Backend/src/server.js`)

| Method | Route |
|---|---|
| GET | `/ping` |
| POST | `/api/careers` |
| POST | `/api/ml-careers` |
| POST | `/api/scores` |
| GET | `/api/collected` |
| GET | `/api/jobs/:soc_code` |
| GET | `/api/majors/:onetsoc_code` |
| — | `/api/email` (router in `src/utils/email.js`) |

ML runs on the backend via `onnxruntime-node` against `Backend/ml/riasec_model.onnx`.

### Tests

`Backend/test/` holds `smoke.js` and `full.js`, driven by `run.js`.
`npm test` runs `node test/run.js` and **assumes the server is already running**
— start it in another terminal first. `TEST_URL` overrides the base URL
(default `http://localhost:3000`). It currently always exits 0; the line to make
required failures fail the command is commented out in `run.js`.

### Frontend

See `Frontend/frontend_docs.md` for the component-by-component breakdown. Short
version: two routes (`/` and `/quiz`), all quiz state owned by
`HollandQuiz.tsx`, results rendered by `ResultsPage.tsx` as a replacement view
rather than a route.

---

## In progress — data ingestion (main chat session only)

**New MSU catalog data ingestion + career↔major re-keying.**

- New, more authoritative MSU data arrived as two CSV exports (Programs,
  Courses). These replace the old web-scraper approach.
- `Backend/data/csvToJSON.js` parses Dataset 1 (Programs), keeps every column
  verbatim, keeps Description as raw HTML and Structure as a raw text blob, and
  extracts `cip_code` into its own field. It also prints Program Type / Degree
  Type tallies, both overall and restricted to CIP-less rows.
- Latest run: **303 program rows parsed, CIP found on 246/303.** The 57 without
  a CIP are written to `programs2026_missing_cip.csv` and are being checked to
  confirm they are genuine non-major program types (minors, requirements,
  licensures) rather than parse failures.
- **Open decision:** whether CIP code (→ SOC crosswalk) can be the primary
  career-join key, with a name/OID fallback for the CIP-less tail.

This work is being solved in the main chat session, **not** by the Claude Code
frontend session.

---

## Frontend work session (Claude Code) — scope

Ground rules:

- Work only in `Frontend/`. Do not touch `Backend/` data files, converters, or
  the read-only sources.
- The READ-ONLY DATA RULE above still applies globally.
- Entry points: `Frontend/src/components/` holds the quiz and results UI.
  Styling is per-component CSS plus `index.css` / `App.css` for globals.
- Read `Frontend/frontend_docs.md` first — it documents every component,
  the accessibility patterns already in use, and the known dead code.

**Current task:** _(fill in before starting a session)_

---

## Deployment quick reference

| | |
|---|---|
| **Frontend** | Vercel, root dir `Frontend`, env `VITE_API_URL` → backend URL. Iframe-embeddable (Vercel sends no `X-Frame-Options: DENY` by default); verify third-party `sessionStorage` behavior when embedded, since `ResultsPage` and `utils/api.ts` both depend on it. |
| **Backend** | Render web service, root dir `Backend`, start command `npm start` (which runs `node src/server.js`). |
| **Email** | SendGrid. Sender must be a verified sender. `SENDGRID_API_KEY` + `FROM_EMAIL` in `Backend/.env`. |

---

## Known dead / legacy code

Worth knowing before you go looking for something that turns out not to matter:

- `Backend/src/index.js` — an older, email-only Express entry point on port
  5000. `src/server.js` is the real one.
- `Backend/src/utils/scrapeMSU.js` and `Backend/data/msu_programs.json` — the
  superseded web-scraper approach. Still referenced by `sqlToJson.js`, so don't
  delete them until `careerMajors.json` is re-keyed off the new catalog data.
- `Backend/data/README (updating data).md` — a stub containing the words
  "By default,". Never written.
- `Frontend/README.md` — still the stock Vite template readme.
- Frontend still lists `pg` (Postgres client) as a dependency despite the
  database migration.
- See the "Known cleanup" section of `Frontend/frontend_docs.md` for the
  frontend's unused modules.
