import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Welcome.css";

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const handleStart = (): void => {
    navigate("/quiz");
  };

  return (
    <div className="welcome-container">
      <div className="welcome-card">

        {/* Page Purpose Title */}
        <h1 className="welcome-title">Discover Your Path</h1>

        <p className="welcome-subtitle">
          Not sure what to study? Our assessment uses the Holland Code theory
          to help you discover majors that align with your interests.
        </p>

        <div className="divider" />

        {/* Holland Code Section */}
        <h2 className="info-title">What is the Holland Code?</h2>

        <p className="info-text">
          The Holland Code (also known as RIASEC) is a career theory
          that matches your interests to different work environments. {""}
        <button
          className="learn-more-button"
          onClick={() => setShowMore(!showMore)}
        >
          {showMore ? "Hide Details" : "Learn More"}
        </button>
        </p>

        {showMore && (
          <div className="expanded-section">
            <p className="info-text">
              The six types—Realistic, Investigative, Artistic, Social,
              Enterprising, and Conventional—describe how people generally
              relate to their work.
            </p>

            <ul className="holland-list">
              <li><strong>Realistic</strong> – Hands-on, practical work</li>
              <li><strong>Investigative</strong> – Analytical, research-focused</li>
              <li><strong>Artistic</strong> – Creative, expressive fields</li>
              <li><strong>Social</strong> – Helping and teaching roles</li>
              <li><strong>Enterprising</strong> – Leadership and business</li>
              <li><strong>Conventional</strong> – Organized, detail-oriented work</li>
            </ul>
          </div>
        )}

        <button
          className="welcome-button"
          onClick={handleStart}
        >
          Start Quiz
        </button>

      </div>
    </div>
  );
};

export default Welcome;