import { useEffect, useRef } from 'react';
import { type Question, type Option } from '../data/types';
import './QuizQuestion.css';

interface Props {
  question: Question;
  options: Option[];
  onAnswer: (weight: number) => void;
}

export const QuizQuestion = ({ question, options, onAnswer }: Props) => {
  const textRef = useRef<HTMLParagraphElement>(null);

  // Answering unmounts the button that had focus, which would drop focus to
  // <body> and send keyboard users back to the top of the page. Move focus to
  // the new question instead, which also makes screen readers announce it.
  useEffect(() => {
    textRef.current?.focus();
  }, [question.id]);

  return (
    <div className="quiz-question-inner" role="group" aria-labelledby="question-text">
      <p className="question-text" id="question-text" ref={textRef} tabIndex={-1}>
        {question.text}
      </p>
      {/* No list roles here: role="listitem" on a <button> replaces its button
          role, so screen readers never announced these as actionable. */}
      <div className="options-list">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="option-btn"
            onClick={() => onAnswer(opt.value)}
            aria-label={`${opt.label}: ${opt.value} out of 5`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
