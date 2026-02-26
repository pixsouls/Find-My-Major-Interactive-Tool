import { type Question, type Option } from '../data/types';
import './QuizQuestion.css';

interface Props {
  question: Question;
  options: Option[];
  onAnswer: (weight: number) => void;
}

export const QuizQuestion = ({ question, options, onAnswer }: Props) => {
  return (
    <div className="quiz-question-inner">
      <p className="question-text">{question.text}</p>

      <div className="options-list">
        {options.map((opt) => (
          <button
            key={opt.value}
            className="option-btn"
            onClick={() => onAnswer(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};