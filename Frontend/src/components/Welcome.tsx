import { useNavigate } from "react-router-dom";
import "./Welcome.css";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <div className="welcome-card">
        <h1 className="welcome-title">Find My Major</h1>
        <p className="welcome-subtitle">
          Not sure what to study? Take our quick Holland Code quiz to find your best-fit major
        </p>
        <button
          className="welcome-button"
          onClick={() => navigate("/quiz")}
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
};

export default Welcome;