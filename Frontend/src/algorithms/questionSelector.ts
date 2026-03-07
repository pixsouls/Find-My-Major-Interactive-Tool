import type { Question, RiasecType } from "../data/types";

/**
 * Selects the next question based on current RIASEC scores
 * Targets the dimension with the LOWEST score to explore uncertainty
 */
export function selectNextQuestion(
  availableQuestions: Question[],
  askedQuestionIds: number[],
  riasecScores: Record<RiasecType, number>
): Question | null {
  
  // Filter out questions that have already been asked
  const unaskedQuestions = availableQuestions.filter(
    q => !askedQuestionIds.includes(q.id)
  );

  // If no questions left, return null
  if (unaskedQuestions.length === 0) {
    return null;
  }

  // Find the dimension with the LOWEST score (most uncertain)
  const lowestType = (Object.entries(riasecScores) as [RiasecType, number][])
    .sort((a, b) => a[1] - b[1])[0][0];

  // Filter questions that target the lowest-scored dimension
  const targetedQuestions = unaskedQuestions.filter(
    q => q.type === lowestType
  );

  // If we have questions for the lowest dimension, pick one randomly
  if (targetedQuestions.length > 0) {
    const randomIndex = Math.floor(Math.random() * targetedQuestions.length);
    return targetedQuestions[randomIndex];
  }

  // Fallback: if no questions available for lowest dimension, pick any random unasked question
  const randomIndex = Math.floor(Math.random() * unaskedQuestions.length);
  return unaskedQuestions[randomIndex];
}