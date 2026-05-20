import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AccentColor = 'emerald' | 'blue' | 'rose' | 'violet' | 'amber';

export const ACCENT_PRESETS: Record<AccentColor, { label: string; labelAr: string; swatch: string; hue: string; primary: string; primaryDark: string; glow: string; heroFrom: string; heroTo: string; ring: string }> = {
  emerald: { label: 'Emerald', labelAr: 'زمردي', swatch: '#10b981', hue: '160', primary: '16 185 129', primaryDark: '52 211 153', glow: 'rgba(16,185,129,0.14)', heroFrom: '#16933a', heroTo: '#06461f', ring: '16 185 129' },
  blue:    { label: 'Ocean',   labelAr: 'محيطي', swatch: '#3b82f6', hue: '217', primary: '59 130 246', primaryDark: '96 165 250', glow: 'rgba(59,130,246,0.14)', heroFrom: '#1d4ed8', heroTo: '#1e3a5f', ring: '59 130 246' },
  rose:    { label: 'Rose',    labelAr: 'وردي', swatch: '#f43f5e', hue: '350', primary: '244 63 94',  primaryDark: '251 113 133', glow: 'rgba(244,63,94,0.14)', heroFrom: '#be123c', heroTo: '#4c0519', ring: '244 63 94' },
  violet:  { label: 'Violet',  labelAr: 'بنفسجي', swatch: '#8b5cf6', hue: '263', primary: '139 92 246', primaryDark: '167 139 250', glow: 'rgba(139,92,246,0.14)', heroFrom: '#6d28d9', heroTo: '#2e1065', ring: '139 92 246' },
  amber:   { label: 'Gold',    labelAr: 'ذهبي', swatch: '#f59e0b', hue: '38',  primary: '245 158 11', primaryDark: '251 191 36',  glow: 'rgba(245,158,11,0.14)', heroFrom: '#b45309', heroTo: '#451a03', ring: '245 158 11' },
};

interface SettingsState {
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
  accentColor: AccentColor;
  soundEnabled: boolean;
  hasCompletedOnboarding: boolean;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  setTheme: (t: 'light' | 'dark') => void;
  setLanguage: (l: 'ar' | 'en') => void;
  setAccentColor: (c: AccentColor) => void;
  setSoundEnabled: (v: boolean) => void;
  toggleSound: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      language: 'ar',
      accentColor: 'emerald',
      soundEnabled: true,
      hasCompletedOnboarding: false,
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      toggleLanguage: () => set({ language: get().language === 'ar' ? 'en' : 'ar' }),
      setTheme: (t) => set({ theme: t }),
      setLanguage: (l) => set({ language: l }),
      setAccentColor: (c) => set({ accentColor: c }),
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    { name: 'score-settings', version: 2 }
  )
);

export function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function applyPreferences(theme: 'light' | 'dark', language: 'ar' | 'en', accentColor: AccentColor = 'emerald') {
  applyTheme(theme);
  
  // Clean up any potential leftover skin classes on html element
  const skins = ['classic', 'felt', 'paper', 'neon', 'oled'];
  skins.forEach((s) => document.documentElement.classList.remove(`skin-${s}`));

  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  const preset = ACCENT_PRESETS[accentColor];
  const root = document.documentElement;
  root.style.setProperty('--accent', preset.primary);
  root.style.setProperty('--accent-dark', preset.primaryDark);
  root.style.setProperty('--accent-glow', preset.glow);
  root.style.setProperty('--accent-hero-from', preset.heroFrom);
  root.style.setProperty('--accent-hero-to', preset.heroTo);
  root.style.setProperty('--accent-ring', preset.ring);
  root.style.setProperty('--accent-swatch', preset.swatch);
}
