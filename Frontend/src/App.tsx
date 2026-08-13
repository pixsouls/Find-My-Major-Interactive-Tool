import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HollandQuiz from './components/HollandQuiz';
import Welcome from "./components/Welcome";
import './App.css';

function App() {
  return (
    <Router>

      {/* Header Stripe */}
      <div className="header-stripe">
        <h1 className="app-title">FIND MY MAJOR</h1>
      </div>

      <div className="app-shell">
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/quiz" element={<HollandQuiz />} />
          </Routes>
        </main>
      </div>

    </Router>
  );
}

export default App;
