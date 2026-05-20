import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { applyPreferences, useSettings } from './store/settings';
import { setSoundEnabled } from './utils/sound';
import Home from './pages/Home';
import History from './pages/History';
import Stats from './pages/Stats';
import Leaderboard from './pages/Leaderboard';
import Trophies from './pages/Trophies';
import NewMatch from './pages/NewMatch';
import LikhaGame from './pages/games/LikhaGame';
import HandSoloGame from './pages/games/HandSoloGame';
import HandPartnersGame from './pages/games/HandPartnersGame';
import TrixGame from './pages/games/TrixGame';
import ComplexGame from './pages/games/ComplexGame';
import TarneebGame from './pages/games/TarneebGame';
import { Onboarding } from './components/Onboarding';

export default function App() {
  const { theme, language, accentColor, skin, soundEnabled } = useSettings();
  const location = useLocation();

  useEffect(() => {
    applyPreferences(theme, language, accentColor, skin);
  }, [theme, language, accentColor, skin]);

  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  return (
    <>
      <Onboarding />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/trophies" element={<Trophies />} />
            <Route path="/new/:kind" element={<NewMatch />} />
            <Route path="/match/:id/likha" element={<LikhaGame />} />
            <Route path="/match/:id/hand-solo" element={<HandSoloGame />} />
            <Route path="/match/:id/hand-partners" element={<HandPartnersGame />} />
            <Route path="/match/:id/trix" element={<TrixGame variant="solo" />} />
            <Route path="/match/:id/trix-solo" element={<TrixGame variant="solo" />} />
            <Route path="/match/:id/trix-partners" element={<TrixGame variant="partners" />} />
            <Route path="/match/:id/complex" element={<ComplexGame variant="solo" />} />
            <Route path="/match/:id/complex-solo" element={<ComplexGame variant="solo" />} />
            <Route path="/match/:id/complex-partners" element={<ComplexGame variant="partners" />} />
            <Route path="/match/:id/tarneeb" element={<TarneebGame variant="regular" />} />
            <Route path="/match/:id/tarneeb-400" element={<TarneebGame variant="400" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
