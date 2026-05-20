import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Users, Layers, ListChecks, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useSettings } from '../store/settings';

interface Slide {
  icon: typeof Users;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  gradient: string;
}

const SLIDES: Slide[] = [
  {
    icon: Users,
    titleAr: 'احفظ لاعبيك',
    titleEn: 'Save your players',
    descAr: 'أضف لاعبين بأسمائهم وصورهم مرة وحدة واستعملهم بكل مباراة بنقرة',
    descEn: 'Add your regular players once and pick them with a single tap in any match',
    gradient: 'from-[#6366f1] to-[#a855f7]',
  },
  {
    icon: Layers,
    titleAr: 'اختار اللعبة',
    titleEn: 'Pick your game',
    descAr: 'ليخة، هند، تركس، كومبلكس، طرنيب — كل لعبة بقواعدها الصحيحة',
    descEn: 'Likha, Hand, Trix, Complex, Tarneeb — each with its correct scoring rules',
    gradient: 'from-[#10b981] to-[#0d9488]',
  },
  {
    icon: ListChecks,
    titleAr: 'سجّل النقاط',
    titleEn: 'Track the score',
    descAr: 'أدخل نتيجة كل جولة وشوف الإحصائيات والترتيب لحظة بلحظة',
    descEn: 'Enter each round and watch live stats, leaderboard and player history',
    gradient: 'from-[#f59e0b] to-[#ef4444]',
  },
];

export function Onboarding() {
  const { language, hasCompletedOnboarding, completeOnboarding } = useSettings();
  const [step, setStep] = useState(0);
  const en = language === 'en';

  if (hasCompletedOnboarding) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const Icon = slide.icon;

  const next = () => {
    if (isLast) completeOnboarding();
    else setStep((s) => s + 1);
  };
  const skip = () => completeOnboarding();

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-gradient-to-b from-[#0a0a1a] via-[#15152a] to-[#0a0a1a] text-white"
      dir={en ? 'ltr' : 'rtl'}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/60">
          <Sparkles className="h-4 w-4" />
          <span>{en ? 'Welcome' : 'مرحباً'}</span>
        </div>
        <button
          onClick={skip}
          className="text-sm font-semibold text-white/60 hover:text-white"
        >
          {en ? 'Skip' : 'تخطي'}
        </button>
      </div>

      {/* Slide */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: en ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: en ? -30 : 30 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div
              className={
                'mb-8 flex h-32 w-32 items-center justify-center rounded-[2rem] bg-gradient-to-br shadow-2xl ' +
                slide.gradient
              }
            >
              <Icon className="h-16 w-16 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-black tracking-tight">
              {en ? slide.titleEn : slide.titleAr}
            </h2>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-white/70">
              {en ? slide.descEn : slide.descAr}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicators */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={
              'h-2 rounded-full transition-all duration-300 ' +
              (i === step ? 'w-8 bg-white' : 'w-2 bg-white/30')
            }
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Bottom action */}
      <div className="px-5 pb-10">
        <button
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-lg font-extrabold text-slate-900 shadow-2xl transition active:scale-[0.98]"
        >
          {isLast
            ? (en ? "Let's start" : 'لنبدأ')
            : (en ? 'Next' : 'التالي')}
          {en ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
