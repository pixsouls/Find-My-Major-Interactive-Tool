# Frontend Documentation — Find My Major

What each file does and what the important functions do.

> Accurate as of the current `FMS` branch. If you add, rename, or delete a
> component, update this file in the same commit — the previous version of this
> doc described four components that did not exist, which cost people time.

---

## Stack

React 19 + TypeScript, built with Vite (`rolldown-vite`), routed with
`react-router-dom` v7. Styling is one CSS file per component plus `index.css`
and `App.css` for globals. No component library.

The backend base URL comes from the `VITE_API_URL` environment variable.

---

## How the app is wired together

```
main.tsx
└── App.tsx  (BrowserRouter)
    ├── "/"      → Welcome.tsx
    └── "/quiz"  → HollandQuiz.tsx
                   ├── QuizQuestion.tsx      (normal state)
                   ├── QuizCheckpoint.tsx    (every 12 questions)
                   ├── ExploreMajors.tsx     (currently unreachable — see notes)
                   └── ResultsPage.tsx       (replaces the whole quiz view)
                       ├── ToolTip.tsx
                       ├── MajorCard.tsx      (one per recommended career)
                       ├── EmailSection.tsx
                       └── CareerInfoPanel.tsx
                           └── CareerDetailModal.tsx
```

**There are only two routes.** `ResultsPage` is not a route — `HollandQuiz`
returns it early instead of rendering the quiz once `showResults` is true.

---

## Components

### Welcome.tsx
The landing page. Explains the Holland Code and starts the quiz.

| Function / state | What it does |
|---|---|
| `handleStart()` | Navigates to `/quiz` |
| `showMore` (state) | Toggles the expanded "six types" explanation |

---

### HollandQuiz.tsx
The controller for the whole quiz. Owns all quiz state and decides which child
to render.

**State:**

| State | What it stores |
|---|---|
| `currentQuestion` | The question object being shown |
| `askedQuestionIds` | IDs already asked, so they aren't repeated |
| `scores` | RIASEC totals, e.g. `{R: 5, I: 3, A: -2, ...}` |
| `questionCount` | How many questions have been answered |
| `isCheckpoint` | Show the checkpoint card instead of a question |
| `isFinalCheckpoint` | No questions remain; checkpoint becomes "Assessment Complete" |
| `showResults` | Render `ResultsPage` instead of the quiz |
| `showExploreMajors` | Render `ExploreMajors` (never set to `true` — see notes) |
| `history` | Stack of `QuizSnapshot` objects powering the Back button |

**Functions:**

| Function | What it does |
|---|---|
| `handleAnswer(weight)` | Snapshots state, converts the 1–5 answer to a −2…+2 weight, adds it to the current question's trait, then picks the next question or opens a checkpoint |
| `selectNextQuestion(...)` | Imported from `algorithms/questionSelector.ts` (see below) |
| `handleContinue()` | Leaves the checkpoint and loads the next question |
| `handleContinueFromResults()` | Returns from `ResultsPage` to the quiz and continues |
| `handleExploreMajors()` | Wired to the checkpoint's "Explore Majors" button — **sets `showResults`**, so it opens the results page, not `ExploreMajors` |
| `handleBack()` | Pops the last snapshot and restores it wholesale |
| `pushSnapshot()` | Pushes current state onto `history` before any change |
| `handleRestart()` | Resets every piece of state to its initial value |

**Answer weighting** — the 1–5 option value is mapped, not used directly:

| Option | Value | Weight applied |
|---|---|---|
| Strongly Disagree | 1 | −2 |
| Disagree | 2 | −1 |
| Neutral | 3 | 0 |
| Agree | 4 | +1 |
| Strongly Agree | 5 | +2 |

Because weights go negative, **a trait score can be negative.** Anything
rendering a score as a percentage has to clamp it (`ResultsPage` does).

**Checkpoints** fire every `questionsUntilCheckpoint = 12` answers. With 48
questions in the bank, that's up to 4 checkpoints.

---

### QuizQuestion.tsx
Renders one question and its five answer buttons.

| Prop | What it is |
|---|---|
| `question` | `{ id, text, type }` |
| `options` | The five `{ label, value }` choices |
| `onAnswer(weight)` | Called with the chosen option's `value` |

Accessibility: answering unmounts the focused button, so a `useEffect` keyed on
`question.id` moves focus to the question text (`tabIndex={-1}`). That both keeps
keyboard users in place and makes screen readers announce the new question.
The options are deliberately **not** given list roles — `role="listitem"` on a
`<button>` overrides the button role.

---

### QuizCheckpoint.tsx
The card shown every 12 questions.

| Prop | What it is |
|---|---|
| `scores` | Current RIASEC totals |
| `questionCount` | Answers so far, sent to the backend |
| `onContinue` | Keep going |
| `onExplore` | "Explore Majors" button |
| `onViewResults` | Shown instead of Continue when `isFinalCheckpoint` |
| `isFinalCheckpoint` | Switches the copy and buttons to the end-of-quiz version |

Side effect: calls `saveScores(scores, questionCount)` from `utils/api.ts` on
mount, so partial progress reaches `collected.csv` even if the user quits.
Moves focus to its heading for the same reason `QuizQuestion` does.

---

### ResultsPage.tsx
The results dashboard. The largest component in the app.

| Prop | What it is |
|---|---|
| `scores` | Final RIASEC totals |
| `questionCount` | Used for "Based on N questions" and `isFromCheckpoint` |
| `onRestart` / `onBack` / `onContinue` | Handlers passed down from `HollandQuiz` |
| `canGoBack` | Disables the Back button when history is empty |

**Key functions:**

| Function | What it does |
|---|---|
| `mergeAlternating(dbCareers, mlCareers)` | Builds the initial list of 10: even slots from the database, odd slots from the ML ranking, skipping duplicate titles |
| `getNextCareer(removedIndex)` | Pulls the next unused career from whichever source the removed card came from |
| `removeCareer(index)` | Removes a card, appends a replacement, and records the removal for undo |
| `undoRemove()` | Restores the last removed card at its original index and drops the replacement |

**How careers load:** on mount it reads or creates a `sessionId` in
`sessionStorage`, calls `getCareers()`, and only then calls `getMLCareers()`.
If the ML call fails it falls back to a database-only list; if the database call
fails it shows an error. `DISPLAY_COUNT` is 10.

Selecting a card fetches `/api/majors/:onetsoc_code` and keeps the top 3.

**Derived values:** `hollandCode` is the top three traits joined (e.g. `"AEI"`);
`isFromCheckpoint` is `questionCount < 48` and controls whether "Continue Quiz"
appears. The trait bars clamp `score / 20` to 0–100 and feed the same number to
both the bar width and `aria-valuenow`.

---

### CareerInfoPanel.tsx
The left-hand "Career Information" card. Shows the selected career's title,
description, related MSU majors, and whether it came from the database or the
ML model. Also owns the "View more" button that opens `CareerDetailModal`.

| Prop | What it is |
|---|---|
| `selectedCareer` | The clicked career, or `null` for the empty state |
| `careerMajors` | Up to 3 `{ major_name, match_strength, msu_url }` |

Closes the modal automatically when `selectedCareer.id` changes.

---

### CareerDetailModal.tsx
Accessible dialog with extra career detail.

| Prop | What it is |
|---|---|
| `career` | The career being detailed |
| `careerMajors` | Used to render "Show me the MSU page for …" links |
| `onClose` | Closes the dialog |

Implements a full focus trap: focuses the close button on open, cycles Tab
inside the dialog, closes on Escape, and returns focus to whatever opened it.

⚠️ **The Salary, Projected Growth, and Job Satisfaction fields are hardcoded
placeholders** (`-` and `N/A`). There is no data source behind them yet.

---

### MajorCard.tsx
One recommended career. Two sibling buttons — the card body and a remove `×` —
rather than a clickable `<div>` wrapping a button, since nesting interactive
elements is invalid and made the card mouse-only.

| Prop | What it is |
|---|---|
| `title` / `description` | Card contents |
| `onClick` | Selects the career |
| `onRemove` | Removes the card |
| `isAI` | Adds a ✨ plus a visually hidden "AI recommended:" prefix |

Note: the file has no `import './MajorCard.css'` — its styles live in
`ResultsPage.css`.

---

### EmailSection.tsx
"Save Results" button that swaps itself for an email field and sends the results.

| Prop | What it is |
|---|---|
| `scores` | Used to compute the top trait included in the email body |

| Function | What it does |
|---|---|
| `sendEmail()` | POSTs `{ to, subject, text }` to `/api/email/send-email`, then alerts on success or failure |

Gotcha: the `emailSent` state actually means "the email form is open", not "an
email was sent". It is set to `true` when the user clicks Save Results and back
to `false` after a successful send.

---

### ToolTip.tsx
Exports `Tooltip` (default). A keyboard-reachable info bubble.

| Prop | What it is |
|---|---|
| `text` | The tooltip content |
| `label` | Accessible name for the trigger; defaults to `"More information"` |

Uses `useId()` to link the trigger to the bubble via `aria-describedby`. The
trigger is a real `<button>` so it can be reached without a mouse.

---

### ExploreMajors.tsx
Lists majors for the user's top three traits.

⚠️ **Currently unreachable.** `HollandQuiz` imports and renders it behind
`showExploreMajors`, but nothing ever calls `setShowExploreMajors(true)` —
the checkpoint's Explore button opens `ResultsPage` instead. Its major lists
are also **hardcoded** in `majorsByTrait`, not fetched from the backend.

---

### icons.tsx
Inline SVGs. Currently exports `LocationIcon` and `PhoneIcon` only.

---

## Algorithms

### algorithms/questionSelector.ts

| Function | What it does |
|---|---|
| `selectNextQuestion(availableQuestions, askedQuestionIds, riasecScores)` | Drops already-asked questions, finds the **lowest**-scoring trait, and returns a random unasked question of that trait. Falls back to any random unasked question, and returns `null` once the bank is exhausted. |

Targeting the lowest score is intentional — it probes the traits we're least
certain about rather than reinforcing an early lead.

### algorithms/scoring.ts
**Empty file.** Scoring currently lives inline in `HollandQuiz.handleAnswer`.

---

## Utilities

### utils/api.ts

| Function | What it does |
|---|---|
| `getCareers(scores, sessionId)` | POSTs scores to `/api/careers` with an `x-session-id` header; returns up to 50 `Career` rows. Throws on a non-OK response. |
| `saveScores(scores, questionsAnswered)` | POSTs to `/api/scores` for the collected-data CSV. Reads or creates its own `sessionId`. Swallows errors — telemetry must never break the quiz. |

### utils/mlCareers.ts

| Function | What it does |
|---|---|
| `getMLCareers(scores)` | POSTs to `/api/ml-careers` for a predicted category, fetches `/ml/riasec_jobs_db.json` from `public/`, ranks every job by cosine similarity against the normalized scores, applies a 1.2× boost to jobs in the predicted category, and returns them sorted best-first. |
| `calculateCosineSimilarity(vecA, vecB)` | Internal helper. |

### utils/localStorageHandler.ts
⚠️ **Currently imported by nothing.** Written for a save/resume feature that was
never wired up.

| Function | What it does |
|---|---|
| `saveScores(scores)` | Writes scores to `localStorage` (name collides with the unrelated `saveScores` in `api.ts`) |
| `loadScores()` | Reads them back, or `null` |
| `ClearQuizData()` | Removes all three quiz keys (note the capital `C`) |
| `clearQuizDataSafe()` | Removes progress and asked-questions but keeps scores |

---

## Data

### data/types.ts
Holds both the shared types **and** the question bank.

| Export | What it is |
|---|---|
| `RiasecType` | `'R' \| 'I' \| 'A' \| 'S' \| 'E' \| 'C'` |
| `Question` | `{ id: number; text: string; type: RiasecType }` |
| `Option` | `{ label: string; value: number }` |
| `questions` | The 48-question bank, ids 1–48, 8 questions per trait |
| `options` | The five Strongly Disagree → Strongly Agree choices |

There is no separate `questions.ts`.

---

## Accessibility notes

Patterns already established — follow them in new work:

- **Move focus when a view is replaced.** `QuizQuestion`, `QuizCheckpoint`, and
  `ResultsPage` each focus a `tabIndex={-1}` heading or paragraph on mount.
  Without this, focus falls to `<body>` and keyboard users restart at the top.
- **Keep `aria-live` regions narrow.** An earlier version wrapped the whole quiz
  card, so every answer re-announced the question and all five options. Only the
  small progress label is live now.
- **Don't put list roles on buttons** — `role="listitem"` replaces the button
  role and the control stops being announced as actionable.
- **Spell out the Holland code** for screen readers so `"AEI"` isn't read as a
  word; `ResultsPage` does this with a `.visually-hidden` span.
- `.visually-hidden` is defined once in `index.css`.
- Only `App.tsx` renders `<main>`. Nested sections use `<section>`.

Known gap: `ExploreMajors` still carries `aria-live="polite"` on its outer
`<section>`, which is the over-broad pattern described above. It's unreachable
today, so fix it if that component is ever wired up.

---

## Assets

Files in `Frontend/public/` are served from the site root once built. Reference
them as `/Tooltip.svg`, not `../../public/Tooltip.svg` — the relative form 404s
in a production build. `public/ml/` holds the ONNX runtime WASM files and
`riasec_jobs_db.json` used by `mlCareers.ts`.

---

## Known cleanup

- `pg` (the Postgres client) is still in `Frontend/package.json` but the app has
  no database access. Leftover from the backend migration; safe to drop.
- `algorithms/scoring.ts` is empty.
- `utils/localStorageHandler.ts` is unused.
- `ExploreMajors.tsx` is unreachable and its data is hardcoded.
- `CareerDetailModal` salary and growth fields are placeholders.
