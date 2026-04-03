import HollandQuiz from './components/HollandQuiz';
import FooterBar from './components/FooterBar';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <HollandQuiz />
      </main>
      <FooterBar
        denverUrl="https://map.concept3d.com/?id=225#!ct/95756,95757,95758?s/"
        phoneText="303-556-5740"
      />
    </div>
  );
}

export default App;