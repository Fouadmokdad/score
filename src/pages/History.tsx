import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useMatches, computeTotals } from '../store/matches';
import { Trash2, ChevronLeft, ChevronRight, CalendarDays, Trophy } from 'lucide-react';
import { copy, gameText } from '../i18n';
import { useSettings } from '../store/settings';
import { PlayerAvatar } from '../components/PlayerAvatar';
import type { GameKind, Match } from '../types';
import { countHandWins } from '../logic/hand';
import { useConfirm } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { CountUp } from '../components/CountUp';
import { ShareMatchCardModal } from '../components/ShareMatchCardModal';

const GRADIENTS: Record<GameKind, string> = {
  likha: 'from-[#6366f1] to-[#a855f7]',
  'hand-solo': 'from-[#f43f5e] to-[#fb923c]',
  'hand-partners': 'from-[#f59e0b] to-[#ef4444]',
  trix: 'from-[#0ea5e9] to-[#2563eb]',
  'trix-solo': 'from-[#b91c1c] to-[#ef4444]',
  'trix-partners': 'from-[#991b1b] to-[#dc2626]',
  complex: 'from-[#10b981] to-[#0d9488]',
  'complex-solo': 'from-[#991b1b] to-[#ef4444]',
  'complex-partners': 'from-[#7f1d1d] to-[#dc2626]',
  tarneeb: 'from-[#7c3aed] to-[#db2777]',
  'tarneeb-400': 'from-[#0891b2] to-[#16a34a]',
};

/* ─── helpers ─── */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const AR_MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const AR_DAYS = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
const EN_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/* ─── Match Card (inline) ─── */
function MatchCover({ match, language }: { match: Match; language: 'en' | 'ar' }) {
  const names = match.config?.originalNames?.length ? match.config.originalNames.slice(0, 4) : match.players.flatMap((p) => p.split(/ و | & /)).slice(0, 4);

  return (
    <div className={'mb-4 overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white shadow-inner ' + GRADIENTS[match.kind]}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-black leading-tight">{gameText[language].labels[match.kind]}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/75">
            {match.rounds.length} {language === 'en' ? 'rounds' : 'جولات'}
          </div>
        </div>
        <div className="flex shrink-0 -space-x-3 rtl:space-x-reverse">
          {names.map((name: string, idx: number) => (
            <div key={`${name}-${idx}`} className="rounded-full ring-2 ring-white/80">
              <PlayerAvatar name={name} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, language, onDelete }: { match: Match; language: 'en' | 'ar'; onDelete: (id: string) => void }) {
  const t = copy[language];
  const confirm = useConfirm();
  const en = language === 'en';
  const totals = computeTotals(match);
  const matchDate = new Date(match.createdAt);
  const dateStr = language === 'en'
    ? matchDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : matchDate.toLocaleDateString('ar-SY-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });

  const [showShareCard, setShowShareCard] = useState(false);

  return (
    <>
      <Link
        to={`/match/${match.id}/${match.kind}`}
        className="group relative block overflow-hidden rounded-3xl border border-black/[0.04] dark:border-white/5 bg-white/95 dark:bg-[#1a1915] p-4 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
      >
      <MatchCover match={match} language={language} />

      {/* Top row */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-500">{dateStr}</span>
        <div className="flex items-center gap-2">
          {match.finished && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {t.finished}
            </span>
          )}
          <span className={'rounded-full px-4 py-1 text-xs font-bold text-white bg-gradient-to-br shadow-inner ' + GRADIENTS[match.kind]}>
            {gameText[language].labels[match.kind]}
          </span>
        </div>
      </div>

      {/* Scores and Players */}
      {totals.length === 2 && (match.kind.includes('partners') || match.kind === 'tarneeb') ? (() => {
        let t1p1: string, t1p2: string, t2p1: string, t2p2: string;
        if (match.config?.originalNames && match.config.originalNames.length >= 4) {
          t1p1 = match.config.originalNames[0];
          t2p1 = match.config.originalNames[1];
          t1p2 = match.config.originalNames[2];
          t2p2 = match.config.originalNames[3];
        } else {
          const s1 = match.players[0]?.split(/ و | & /) || [];
          const s2 = match.players[1]?.split(/ و | & /) || [];
          t1p1 = s1[0] || 'P1';
          t1p2 = s1[1] || 'P2';
          t2p1 = s2[0] || 'P3';
          t2p2 = s2[1] || 'P4';
        }
        return (
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-1 flex-col items-center">
              <div className={"text-3xl font-black mb-2 " + (totals[0] < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white')}><CountUp value={totals[0]} /></div>
              <div className="flex items-center justify-center -space-x-2 space-x-reverse">
                <div className="z-10 rounded-full ring-2 ring-white dark:ring-[#1a1915]"><PlayerAvatar name={t1p1} size="sm" /></div>
                <div className="z-0 rounded-full ring-2 ring-white dark:ring-[#1a1915]"><PlayerAvatar name={t1p2} size="sm" /></div>
              </div>
              <div className="mt-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">{match.players[0]}</div>
            </div>
            {/* Divider + Score Diff */}
            <div className="relative mx-2 flex flex-col items-center">
              <div className="h-16 w-[1px] bg-black/5 dark:bg-white/10" />
              {match.rounds.length > 0 && (() => {
                // Adjusted diff: each win counts as -100 from effective score
                const isHand = match.kind === 'hand-partners' || match.kind === 'hand-solo';
                const wins = isHand ? countHandWins(match.rounds, match.players.length) : [0, 0];
                const effective0 = totals[0] - wins[0] * 100;
                const effective1 = totals[1] - wins[1] * 100;
                const scoreDiff = Math.abs(effective0 - effective1);
                return (
                  <div
                    className={
                      'absolute top-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-lg border-2 px-1.5 py-0.5 shadow-md backdrop-blur-sm min-w-[2rem] ' +
                      (scoreDiff >= 200
                        ? 'border-red-400 bg-red-500/90 text-white'
                        : scoreDiff >= 100
                          ? 'border-amber-400 bg-amber-500/90 text-white'
                          : 'border-slate-200 bg-white/95 text-slate-600 dark:border-white/15 dark:bg-[#1a1915]/95 dark:text-slate-300')
                    }
                  >
                    <span className="text-[7px] font-bold uppercase leading-none opacity-70">{language === 'en' ? 'DIFF' : 'فرق'}</span>
                    <span className="text-xs font-black leading-tight">{scoreDiff}</span>
                  </div>
                );
              })()}
            </div>
            <div className="flex flex-1 flex-col items-center">
              <div className={"text-3xl font-black mb-2 " + (totals[1] < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white')}><CountUp value={totals[1]} /></div>
              <div className="flex items-center justify-center -space-x-2 space-x-reverse">
                <div className="z-10 rounded-full ring-2 ring-white dark:ring-[#1a1915]"><PlayerAvatar name={t2p1} size="sm" /></div>
                <div className="z-0 rounded-full ring-2 ring-white dark:ring-[#1a1915]"><PlayerAvatar name={t2p2} size="sm" /></div>
              </div>
              <div className="mt-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">{match.players[1]}</div>
            </div>
          </div>
        );
      })() : (
        <div className="flex items-center justify-between gap-1">
          {totals.map((tot, idx) => (
            <div key={idx} className="flex flex-1 flex-col items-center">
              <div className={"text-xl font-black mb-2 " + (tot < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white')}><CountUp value={tot} /></div>
              <PlayerAvatar name={match.players[idx]} size="sm" />
              <div className="mt-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">{match.players[idx]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChevronLeft className="h-5 w-5 text-slate-400 transition-colors group-hover:text-slate-800 dark:text-slate-500 dark:group-hover:text-white" />
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const ok = await confirm({
                title: en ? 'Delete match?' : 'حذف المباراة؟',
                message: en
                  ? 'This match and all of its rounds will be permanently removed.'
                  : 'سيتم حذف المباراة وكل جولاتها بشكل نهائي.',
                confirmText: en ? 'Delete' : 'حذف',
                cancelText: en ? 'Cancel' : 'إلغاء',
                tone: 'danger',
              });
              if (ok) onDelete(match.id);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-500 transition-all hover:bg-red-500 hover:text-white"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {match.finished && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowShareCard(true);
              }}
              className="flex h-8 px-3 items-center justify-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-all hover:bg-amber-500 hover:text-white text-xs font-bold"
              aria-label="Share Match Card"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>{en ? 'Share' : 'مشاركة'}</span>
            </button>
          )}
        </div>
        <span className="text-xs font-medium text-slate-500">{language === 'en' ? 'Rounds: ' : 'جولة: '}{match.rounds.length}</span>
      </div>
    </Link>
    {showShareCard && (
      <ShareMatchCardModal matchId={match.id} onClose={() => setShowShareCard(false)} />
    )}
    </>
  );
}

/* ─── Calendar Picker ─── */
function CalendarPicker({
  selectedDate,
  onSelect,
  onClose,
  matchDates,
  language,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
  matchDates: Set<string>; // "YYYY-MM-DD" strings
  language: 'en' | 'ar';
}) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const today = startOfDay(new Date());

  const monthLabel = language === 'ar'
    ? `${AR_MONTHS[viewMonth]} ${viewYear}`
    : `${EN_MONTHS[viewMonth]} ${viewYear}`;
  const dayNames = language === 'ar' ? AR_DAYS : EN_DAYS;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-[2rem] p-5 animate-in zoom-in-95 glass-modal">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-base font-bold text-slate-800 dark:text-white">{monthLabel}</span>
          <button onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((dn) => (
            <div key={dn} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{dn}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const cellDate = new Date(viewYear, viewMonth, day);
            const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasMatch = matchDates.has(dateKey);
            const isToday = isSameDay(cellDate, today);
            const isSelected = isSameDay(cellDate, selectedDate);

            return (
              <button
                key={day}
                onClick={() => { onSelect(cellDate); onClose(); }}
                disabled={!hasMatch}
                className={
                  'relative flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all ' +
                  (isSelected
                    ? 'bg-[rgb(var(--accent))] text-white shadow-lg shadow-[rgba(var(--accent),0.3)]'
                    : hasMatch
                      ? 'text-slate-800 dark:text-white hover:bg-[rgba(var(--accent),0.15)] dark:hover:bg-[rgba(var(--accent),0.2)] cursor-pointer'
                      : 'text-slate-300 dark:text-slate-600 cursor-default'
                  )
                }
              >
                {day}
                {hasMatch && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[rgb(var(--accent))]" />
                )}
                {isToday && !isSelected && (
                  <span className="absolute inset-0 rounded-xl ring-2 ring-[rgba(var(--accent),0.5)] pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => { onSelect(today); onClose(); }}
            className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-bold"
          >
            {language === 'ar' ? 'اليوم' : 'Today'}
          </button>
          <button
            onClick={() => { onSelect(new Date(0)); onClose(); }}
            className="flex-1 rounded-xl bg-black/[0.04] dark:bg-white/10 py-2.5 text-sm font-bold text-slate-700 dark:text-white transition hover:bg-black/[0.07] dark:hover:bg-white/15 active:scale-95"
          >
            {language === 'ar' ? 'عرض الكل' : 'Show All'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── History Page ─── */
export default function History() {
  const { matches, deleteMatch, clearAll } = useMatches();
  const { language } = useSettings();
  const confirm = useConfirm();
  const t = copy[language];
  const en = language === 'en';
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'finished'>('all');

  // Build a set of "YYYY-MM-DD" strings for days that have matches
  const matchDates = useMemo(() => {
    const s = new Set<string>();
    matches.forEach((m) => {
      const d = new Date(m.createdAt);
      s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    });
    return s;
  }, [matches]);

  // "Show All" is represented by Date(0)
  const showAll = selectedDate.getTime() === 0;

  const filtered = useMemo(() => {
    let list = [...matches].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!showAll) {
      list = list.filter((m) => {
        const d = new Date(m.createdAt);
        return isSameDay(d, selectedDate);
      });
    }
    if (statusFilter === 'running') list = list.filter((m) => !m.finished);
    if (statusFilter === 'finished') list = list.filter((m) => m.finished);
    return list;
  }, [matches, selectedDate, showAll, statusFilter]);

  const dateLabel = showAll
    ? (language === 'ar' ? 'كل الأيام' : 'All Days')
    : isSameDay(selectedDate, today)
      ? (language === 'ar' ? 'اليوم' : 'Today')
      : language === 'en'
        ? selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        : selectedDate.toLocaleDateString('ar-SY-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Layout title={t.history}>
      {/* Date Filter Bar */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => setShowCalendar(true)}
          className="flex items-center gap-2.5 rounded-2xl border border-black/[0.04] dark:border-white/10 bg-white/95 dark:bg-white/5 px-4 py-2.5 shadow-sm transition hover:shadow-md active:scale-95"
        >
          <CalendarDays className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-bold text-slate-800 dark:text-white">{dateLabel}</span>
        </button>

        {matches.length > 0 && (
          <button
            className="rounded-xl px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={async () => {
              const ok = await confirm({
                title: en ? 'Delete all matches?' : 'حذف كل المباريات؟',
                message: en
                  ? 'All match history and saved rounds will be permanently removed.'
                  : 'سيتم حذف كل سجل المباريات والجولات المحفوظة بشكل نهائي.',
                confirmText: en ? 'Delete all' : 'حذف الكل',
                cancelText: en ? 'Cancel' : 'إلغاء',
                tone: 'danger',
              });
              if (ok) clearAll();
            }}
          >
            {t.clearAll}
          </button>
        )}
      </div>

      {/* Status Filter Pills */}
      <div className="mb-4 flex gap-2">
        {(['all', 'running', 'finished'] as const).map((s) => {
          const label = s === 'all'
            ? (language === 'ar' ? 'الكل' : 'All')
            : s === 'running'
              ? (language === 'ar' ? 'جارية' : 'Running')
              : (language === 'ar' ? 'منتهية' : 'Finished');
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={
                'rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 ' +
                (isActive
                  ? 'bg-[rgb(var(--accent))] text-white shadow-md shadow-[rgba(var(--accent),0.25)]'
                  : 'bg-black/[0.03] dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-black/[0.06] dark:hover:bg-white/15'
                )
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Match Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={language === 'ar' ? 'لا توجد مباريات في هذا اليوم' : 'No matches on this day'}
          description={language === 'ar' ? 'غيّر الفلتر أو اعرض كل الأيام لمراجعة سجل المباريات.' : 'Change the filter or show all days to browse your match history.'}
          action={{ label: language === 'ar' ? 'عرض الكل' : 'Show All', onClick: () => setSelectedDate(new Date(0)) }}
        />
      ) : (
        <div className="space-y-4 pb-4">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} language={language} onDelete={deleteMatch} />
          ))}
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <CalendarPicker
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onClose={() => setShowCalendar(false)}
          matchDates={matchDates}
          language={language}
        />
      )}
    </Layout>
  );
}
