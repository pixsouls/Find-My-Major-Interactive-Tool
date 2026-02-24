import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HollandQuiz from "./components/HollandQuiz";
import Welcome from "./components/Welcome";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/quiz" element={<HollandQuiz />} />
      </Routes>
    </Router>
  );
}

export default App;