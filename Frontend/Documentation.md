# Frontend Documentation - Find My Major

## Overview
This doc explains the main parts of our frontend code — what each file does and what the important functions do.

---

## Components

### Welcome.tsx
**What it does:** The first page users see. Has a button to start the quiz.

**Key functions:**
| Function | What it does |
|----------|---------------|
| `handleStartQuiz()` | Takes user to the `/quiz` page |

---

### HollandQuiz.tsx
**What it does:** The main quiz — handles questions, answers, and scoring.

**Key functions:**
| Function | What it does |
|----------|---------------|
| `handleAnswer(questionId, answerValue)` | Saves user's answer and updates their RIASEC scores |
| `moveToNextQuestion()` | Goes to next question or shows results when done |
| `calculateRIASECScores()` | Counts up points for each RIASEC type (R, I, A, S, E, C) |
| `resetQuiz()` | Clears everything and starts quiz over |

**State (data it tracks):**
| State | What it stores |
|-------|----------------|
| `currentQuestionIndex` | Which question user is on |
| `answers` | All the user's answers |
| `scores` | RIASEC scores like {R:5, I:3, A:7, etc.} |

---

### QuizQuestion.tsx
**What it does:** Shows one question at a time and lets users pick an answer.

**Props (things passed into it):**
| Prop | What it is |
|------|------------|
| `question` | The question text and which RIASEC type it belongs to |
| `onAnswer` | Function that runs when user picks an answer |

**Key functions:**
| Function | What it does |
|----------|---------------|
| `handleOptionSelect(optionValue)` | Tells the parent component what answer user picked |

---

### QuizCheckpoint.tsx
**What it does:** Pops up after 12 questions. Shows user their scores so far and asks if they want to keep going.

**Props:**
| Prop | What it is |
|------|------------|
| `currentScores` | User's RIASEC scores after first 12 questions |
| `onContinue` | What happens if user says "yes, keep going" |
| `onFinish` | What happens if user says "no, show results now" |

**Key functions:**
| Function | What it does |
|----------|---------------|
| `handleContinue()` | Keeps quiz going with more questions |
| `handleFinish()` | Shows final results right now |

---

### SavedResults.tsx
**What it does:** Shows saved results when someone opens a link like `/results/abc123`.

**Key functions:**
| Function | What it does |
|----------|---------------|
| `useEffect()` | When page loads, grabs the ID from URL and tries to load saved results |
| `renderNotFound()` | Shows "sorry, link doesn't work" message if nothing found |

**State:**
| State | What it stores |
|-------|----------------|
| `results` | The saved quiz data (scores, date, etc.) |
| `notFound` | True if the result ID doesn't exist anymore |

---

### Popup.tsx
**What it does:** A popup that asks users if they want to save their results for later.

**Props:**
| Prop | What it is |
|------|------------|
| `message` | The main question (like "Save your results?") |
| `description` | Extra info (optional) |
| `onAllow` | Runs when user clicks "Yes" |
| `onDeny` | Runs when user clicks "No thanks" |

---

### ExploreMajors.tsx
**What it does:** Shows recommended majors based on user's RIASEC results.

**Key functions:**
| Function | What it does |
|----------|---------------|
| `loadMajorRecommendations(scores)` | Looks up which majors match user's top traits |
| `displayMajorsList()` | Shows the list of majors on screen |

---

### FooterBar.tsx
**What it does:** The bar at the bottom of every page with MSU Denver contact info.

**Props:**
| Prop | What it is |
|------|------------|
| `denverUrl` | Link to MSU Denver map |
| `phoneText` | School phone number |

---

### icons.tsx
**What it does:** Holds all the little SVG icons used in the app.

**Icons included:**
| Icon | What it's for |
|------|---------------|
| `ArrowIcon` | Next/back arrows |
| `CheckIcon` | Checkmarks |
| `ProgressIcon` | Progress bar dots |

---

## Utilities (Helpers)

### localStorageHandler.ts
**What it does:** Saves and loads quiz data to your browser's storage so you don't lose progress.

**Functions:**
| Function | What it does | Returns |
|----------|---------------|---------|
| `saveScores(scores)` | Saves RIASEC scores | nothing |
| `loadScores()` | Gets saved scores from storage | scores or null |
| `clearQuizData()` | Deletes all quiz data | nothing |
| `clearQuizDataSafe()` | Deletes progress but keeps scores | nothing |
| `generateResultId()` | Makes a unique ID for saved results | string like "abc123" |
| `saveResultForUrl(id, data)` | Saves results with that ID | nothing |
| `getResultById(id)` | Gets results by ID | data or null |

---

## Data Files

### types.ts
**What it does:** Defines types used throughout the app.

**Main types:**
| Type | What it means |
|------|---------------|
| `RiasecType` | 'R' \| 'I' \| 'A' \| 'S' \| 'E' \| 'C' |
| `Question` | Object with question text and RIASEC category |
| `Scores` | Object mapping RIASEC types to numbers |

### questions.ts
**What it does:** Has the 12 RIASEC quiz questions.

**Format:**
```typescript
{
  id: number,
  text: string,
  riasecCategory: 'R' or 'I' or 'A' etc.
}