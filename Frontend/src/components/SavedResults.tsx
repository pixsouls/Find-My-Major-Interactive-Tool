import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { loadScores } from '../utils/localStorageHandler';
import type { RiasecType } from '../data/types';
import './SavedResults.css';

export default function SavedResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [scores, setScores] = useState<Record<RiasecType, number> | null>(null);
  const [dataSource, setDataSource] = useState<'url' | 'localStorage' | 'none'>('none');

  useEffect(() => {
    // Try to get scores from URL parameters first
    const urlScores: Partial<Record<RiasecType, number>> = {};
    let foundUrlParams = false;

    ['R', 'I', 'A', 'S', 'E', 'C'].forEach((type) => {
      const value = searchParams.get(type);
      if (value !== null) {
        urlScores[type as RiasecType] = parseFloat(value);
        foundUrlParams = true;
      }
    });

    if (foundUrlParams && Object.keys(urlScores).length === 6) {
      setScores(urlScores as Record<RiasecType, number>);
      setDataSource('url');
      return;
    }

    // If no URL params, try localStorage
    const savedScores = loadScores();
    if (savedScores) {
      setScores(savedScores);
      setDataSource('localStorage');
      return;
    }

    // No data found
    setDataSource('none');
  }, [searchParams]);

  const getTopThree = (scores: Record<RiasecType, number>) => {
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  };

  const typeNames: Record<RiasecType, string> = {
    R: 'Realistic',
    I: 'Investigative',
    A: 'Artistic',
    S: 'Social',
    E: 'Enterprising',
    C: 'Conventional'
  };

  if (dataSource === 'none') {
    return (
      <div className="saved-results-container">
        <div className="results-card">
          <h2>No Results Found</h2>
          <p>We couldn't find any saved quiz results.</p>
          <button 
            className="retake-quiz-btn"
            onClick={() => navigate('/quiz')}
          >
            Take the Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!scores) {
    return (
      <div className="saved-results-container">
        <div className="results-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const topThree = getTopThree(scores);

  return (
    <div className="saved-results-container">
      <div className="results-card">
        
        {/* Data Source Badge */}
        <div className="data-source-badge">
          {dataSource === 'url' ? '🔗 Loaded from URL' : '💾 Loaded from Local Storage'}
        </div>

        <h2>Your Holland Career Categories</h2>
        
        {/* Top 3 Categories */}
        <div className="top-categories">
          {topThree.map(([type, score], index) => (
            <div key={type} className={`category-item rank-${index + 1}`}>
              <div className="rank-badge">#{index + 1}</div>
              <div className="category-info">
                <h3>{typeNames[type as RiasecType]}</h3>
                <span className="category-code">{type}</span>
                <div className="score-display">Score: {score.toFixed(1)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* All Scores */}
        <div className="all-scores">
          <h3>Complete Profile</h3>
          <div className="score-grid">
            {Object.entries(scores)
              .sort((a, b) => b[1] - a[1])
              .map(([type, score]) => (
                <div key={type} className="score-item">
                  <span className="score-type">{type} - {typeNames[type as RiasecType]}</span>
                  <span className="score-value">{score.toFixed(1)}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button 
            className="retake-quiz-btn"
            onClick={() => navigate('/quiz')}
          >
            Retake Quiz
          </button>
        </div>

      </div>
    </div>
  );
}