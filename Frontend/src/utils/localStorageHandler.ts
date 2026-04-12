import type { RiasecType } from '../data/types';

const STORAGE_KEYS = {
  QUIZ_SCORES: 'holland_quiz_scores',
  QUIZ_PROGRESS: 'holland_quiz_progress',
  ASKED_QUESTIONS: 'holland_quiz_asked_questions'
} as const;


// save holland scores
export function saveScores(scores: Record<RiasecType, number>): void {
  localStorage.setItem(STORAGE_KEYS.QUIZ_SCORES, JSON.stringify(scores))
}

// load holland scores
export function loadScores(): Record<RiasecType,number> | null {
  const data = localStorage.getItem(STORAGE_KEYS.QUIZ_SCORES);
  return data ? JSON.parse(data) : null;
}

// Delete all data
export function ClearQuizData(): void {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
}

// Delete all data ONLY if data doesn't already exist.
// In other words, reset everything that needs to be reset before the quiz
export function clearQuizDataSafe(): void {
  // let popup_name = "Heads Up!"
  // let popup_desc = "You Have previously saved data, would you like to clear it and try the quiz again?"
  // if (displayPopup(popup_name, popup_desc, "Confirm", "Deny") != true) {
  // return // execute code if user presses confirm
  // } else {
  // return // execute code if user presses deny
  // }
  Object.values(STORAGE_KEYS).forEach(key => {
    if (key === 'holland_quiz_progress' || key === 'holland_quiz_asked_questions') {
      localStorage.removeItem(key);
    }
  });
}