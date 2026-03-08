import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HollandQuiz from './components/HollandQuiz';
import Welcome from "./components/Welcome";
import FooterBar from "./components/FooterBar";
import SavedResults from "./components/SavedResults"; 
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
            <Route path="/results/:id" element={<SavedResults />} />  {/* ← ADD THIS ROUTE */}
          </Routes>
        </main>

        <FooterBar
          denverUrl="https://map.concept3d.com/?id=225#!ct/95756,95757,95758?s/"
          phoneText="303-556-5740"
        />
      </div>

    </Router>
  );
}

export default App;   