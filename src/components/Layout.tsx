import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Home, History, BarChart3, ArrowRight, ArrowLeft, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import { applyPreferences, useSettings, ACCENT_PRESETS, type AccentColor } from '../store/settings';
import { copy } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  headerAction?: React.ReactNode;
}

const ACCENT_KEYS: AccentColor[] = ['emerald', 'blue', 'rose', 'violet', 'amber'];

export function Layout({ children, title, back, headerAction }: LayoutProps) {
  const { theme, language, accentColor, toggleTheme, toggleLanguage, setAccentColor } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const t = copy[language];
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    applyPreferences(theme, language, accentColor);
  }, [theme, language, accentColor]);

  const isActive = (p: string) => location.pathname === p;

  return (
    <div className="app-shell min-h-full flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-white/5 dark:bg-[#171715]/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            {back && (
              <button onClick={() => navigate(-1)} className="btn-ghost px-2 py-2" aria-label={t.back}>
                {language === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-swatch)' }}>
                <img
                  src={language === 'ar' ? '/jawaker-assets/logo/ArLogoWhite.svg' : '/jawaker-assets/logo/EngLogoWhite.svg'}
                  alt=""
                  className="hidden h-6 w-auto dark:block"
                />
                <span className="dark:hidden">Score</span>
              </div>
              <h1 className="truncate text-base font-extrabold leading-tight sm:text-lg">{title ?? t.appName}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {headerAction}
            {/* Accent color picker */}
            <div className="relative">
              <button
                onClick={() => setShowColors(!showColors)}
                className="btn-ghost px-2 py-2"
                aria-label="Theme color"
              >
                <Palette className="h-5 w-5" style={{ color: 'var(--accent-swatch)' }} />
              </button>
              {showColors && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColors(false)} />
                  <div className="absolute end-0 top-full z-50 mt-2 flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#201f1b]">
                    {ACCENT_KEYS.map((key) => (
                      <button
                        key={key}
                        onClick={() => { setAccentColor(key); setShowColors(false); }}
                        className={
                          'h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ' +
                          (accentColor === key ? 'border-white ring-2 scale-110' : 'border-transparent')
                        }
                        style={{
                          backgroundColor: ACCENT_PRESETS[key].swatch,
                          ...(accentColor === key ? { boxShadow: `0 0 0 2px ${ACCENT_PRESETS[key].swatch}` } : {}),
                        }}
                        title={language === 'ar' ? ACCENT_PRESETS[key].labelAr : ACCENT_PRESETS[key].label}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={toggleLanguage} className="btn-ghost px-3 py-2 text-sm" aria-label="Toggle language">
              {t.language}
            </button>
            <button onClick={toggleTheme} className="btn-ghost px-2 py-2" aria-label={t.theme}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 pb-24 sm:px-4 sm:py-5">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/5 dark:bg-[#171715]/95">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          <NavItem to="/" active={isActive('/')} icon={<Home className="h-5 w-5" />} label={t.home} />
          <NavItem to="/history" active={isActive('/history')} icon={<History className="h-5 w-5" />} label={t.history} />
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
        'flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-semibold transition sm:py-3 sm:text-xs ' +
        (active ? '' : 'text-slate-500 dark:text-slate-400')
      }
      style={active ? { color: 'var(--accent-swatch)' } : undefined}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
