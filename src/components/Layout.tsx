import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { TouchEvent } from 'react';
import {
  Moon,
  Sun,
  Home,
  History,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Palette,
  MoreVertical,
  Trophy,
  Award,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  applyPreferences,
  useSettings,
  ACCENT_PRESETS,
  type AccentColor,
} from '../store/settings';
import { copy } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  headerAction?: React.ReactNode;
}

const ACCENT_KEYS: AccentColor[] = ['emerald', 'blue', 'rose', 'violet', 'amber'];

export function Layout({ children, title, back, headerAction }: LayoutProps) {
  const { theme, language, accentColor, soundEnabled, toggleTheme, toggleLanguage, setAccentColor, toggleSound } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const t = copy[language];
  const en = language === 'en';
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    applyPreferences(theme, language, accentColor);
  }, [theme, language, accentColor]);

  useEffect(() => {
    setShowHeaderMenu(false);
  }, [location.pathname]);

  const isActive = (p: string) => location.pathname === p;
  const closeMenu = () => setShowHeaderMenu(false);
  const tabs = ['/', '/history', '/leaderboard', '/trophies', '/stats'];
  const currentTabIndex = tabs.indexOf(location.pathname);

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!touchStart.current || currentTabIndex < 0) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const direction = language === 'ar' ? -Math.sign(dx) : Math.sign(dx);
    const nextIndex = currentTabIndex - direction;
    if (nextIndex >= 0 && nextIndex < tabs.length) navigate(tabs[nextIndex]);
  };

  return (
    <div className="app-shell min-h-full flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-white/5 dark:bg-[#171715]/95">
        <div className="mx-auto grid max-w-5xl grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="relative flex justify-start">
            <button
              onClick={() => setShowHeaderMenu((value) => !value)}
              className="btn-ghost px-2 py-2"
              aria-label="Open settings"
              aria-expanded={showHeaderMenu}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {showHeaderMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeMenu} />
                <div
                  className={
                    'absolute top-full z-50 mt-2 w-72 rounded-3xl p-3.5 shadow-2xl glass-modal ' +
                    (language === 'ar' ? 'right-0' : 'left-0')
                  }
                >
                  {/* Top quick row */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-1 pb-2 dark:border-white/10">
                    {headerAction ? <div onClick={closeMenu}>{headerAction}</div> : <span />}
                    <button onClick={() => { toggleSound(); }} className="btn-ghost h-11 w-11 px-0" aria-label={t.sound}>
                      {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-slate-400" />}
                    </button>
                    <button onClick={() => { toggleLanguage(); closeMenu(); }} className="btn-ghost h-11 px-3 text-sm" aria-label="Toggle language">
                      {t.language}
                    </button>
                    <button onClick={() => { toggleTheme(); closeMenu(); }} className="btn-ghost h-11 w-11 px-0" aria-label={t.theme}>
                      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Accent color */}
                  <div className="px-1 pt-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <Palette className="h-4 w-4" style={{ color: 'var(--accent-swatch)' }} />
                      <span>{t.appColor}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {ACCENT_KEYS.map((key) => (
                        <button
                          key={key}
                          onClick={() => { setAccentColor(key); }}
                          className={
                            'h-9 w-9 rounded-full border-2 transition-all hover:scale-105 ' +
                            (accentColor === key ? 'border-white scale-105' : 'border-transparent')
                          }
                          style={{
                            backgroundColor: ACCENT_PRESETS[key].swatch,
                            ...(accentColor === key ? { boxShadow: `0 0 0 2px ${ACCENT_PRESETS[key].swatch}` } : {}),
                          }}
                          title={language === 'ar' ? ACCENT_PRESETS[key].labelAr : ACCENT_PRESETS[key].label}
                        />
                      ))}
                    </div>
                  </div>


                </div>
              </>
            )}
          </div>
          <div className="min-w-0 text-center">
            <img
              src="app-icon.png"
              alt=""
              className="mx-auto mb-1 h-8 w-8 rounded-lg object-cover shadow-sm ring-1 ring-amber-400/40"
            />
            <h1 className="truncate text-lg font-extrabold leading-tight text-slate-900 dark:text-white sm:text-xl">
              {title ?? t.appName}
            </h1>
          </div>
          <div className="flex justify-end">
            {back && (
              <button onClick={() => navigate(-1)} className="btn-ghost px-2 py-2" aria-label={t.back}>
                {language === 'ar' ? <ArrowRight className="h-6 w-6" /> : <ArrowLeft className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 pb-24 sm:px-4 sm:py-5"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/5 dark:bg-[#171715]/95">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          <NavItem to="/" active={isActive('/')} icon={<Home className="h-5 w-5" />} label={t.home} />
          <NavItem to="/history" active={isActive('/history')} icon={<History className="h-5 w-5" />} label={t.history} />
          <NavItem to="/leaderboard" active={isActive('/leaderboard')} icon={<Trophy className="h-5 w-5" />} label={t.leaderboard} />
          <NavItem to="/trophies" active={isActive('/trophies')} icon={<Award className="h-5 w-5" />} label={t.trophies} />
          <NavItem to="/stats" active={isActive('/stats')} icon={<BarChart3 className="h-5 w-5" />} label={t.stats} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className={
        'flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition sm:py-3 sm:text-xs ' +
        (active ? '' : 'text-slate-500 dark:text-slate-400')
      }
      style={active ? { color: 'var(--accent-swatch)' } : undefined}
    >
      {icon}
      <span className="truncate max-w-full">{label}</span>
    </Link>
  );
}
