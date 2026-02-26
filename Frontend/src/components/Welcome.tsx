import React from "react";
import { useNavigate } from "react-router-dom";
import "./Welcome.css";

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = (): void => {
    navigate("/quiz");
  };

  return (
    <div className="welcome-container">
      <div className="welcome-card">

        <h1 className="welcome-title">Find My Major</h1>

        <p className="welcome-subtitle">
          Not sure what to study? Our assessment uses the Holland Code theory
          to help you discover majors that align with your interests.
        </p>

        <div className="divider" />

        <h2 className="info-title">What is the Holland Code?</h2>

        <p className="info-text">
          The Holland Code (also known as RIASEC) is a career theory
          that matches your interests to different work environments.
          The six types--Realistic, Investigative, Artistic, Social, Enterprising,
          and Conventional-- describe how people generally relate to their work.
        </p>

        <p className="info-text">
          This tool will guide you to better understanding of your own interests
          and provide tailored recommendations for careers and academic programs
          at MSU Denver.
        </p>

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