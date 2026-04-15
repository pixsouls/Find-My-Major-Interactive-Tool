import { type Question, type Option } from '../data/types';
import './QuizQuestion.css';

interface Props {
  question: Question;
  options: Option[];
  onAnswer: (weight: number) => void;
}

export const QuizQuestion = ({ question, options, onAnswer }: Props) => {
  return (
    <div className="quiz-question-inner" role="group" aria-labelledby="question-text">
      <p className="question-text" id="question-text">{question.text}</p>
      <div className="options-list" role="list" aria-label="Answer options">
        {options.map((opt) => (
          <button
            key={opt.value}
            className="option-btn"
            onClick={() => onAnswer(opt.value)}
            aria-label={`${opt.label}: ${opt.value} out of 5`}
            role="listitem"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};