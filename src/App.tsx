import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { applyPreferences, useSettings } from './store/settings';
import Home from './pages/Home';
import History from './pages/History';
import Stats from './pages/Stats';
import NewMatch from './pages/NewMatch';
import LikhaGame from './pages/games/LikhaGame';
import HandSoloGame from './pages/games/HandSoloGame';
import HandPartnersGame from './pages/games/HandPartnersGame';
import TrixGame from './pages/games/TrixGame';
import ComplexGame from './pages/games/ComplexGame';

export default function App() {
  const { theme, language, accentColor } = useSettings();
  useEffect(() => {
    applyPreferences(theme, language, accentColor);
  }, [theme, language, accentColor]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/history" element={<History />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/new/:kind" element={<NewMatch />} />
      <Route path="/match/:id/likha" element={<LikhaGame />} />
      <Route path="/match/:id/hand-solo" element={<HandSoloGame />} />
      <Route path="/match/:id/hand-partners" element={<HandPartnersGame />} />
      <Route path="/match/:id/trix" element={<TrixGame />} />
      <Route path="/match/:id/complex" element={<ComplexGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
