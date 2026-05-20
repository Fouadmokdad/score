import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCw } from 'lucide-react';
import type { Match } from '../types';

const COLORS = [
  '#10b981',
  '#f43f5e',
  '#3b82f6',
  '#eab308',
];

interface ChartPoint {
  playerIndex: number;
  roundIndex: number;
  value: number;
  x: number;
  y: number;
}

export function MatchChart({ match }: { match: Match }) {
  const [active, setActive] = useState<ChartPoint | null>(null);

  const chart = useMemo(() => {
    if (match.rounds.length < 2) return null;

    const roundsCount = match.rounds.length;
    const numPlayers = match.players.length;
    const history: number[][] = [];
    let current = new Array(numPlayers).fill(0);
    history.push([...current]);

    for (const round of match.rounds) {
      current = current.map((val, i) => val + (round.deltas[i] || 0));
      history.push([...current]);
    }

    let min = 0;
    let max = 0;
    for (const row of history) {
      for (const val of row) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }

    if (max === min) {
      max += 10;
      min -= 10;
    }

    const range = max - min;
    const yMin = min - range * 0.14;
    const yMax = max + range * 0.14;
    const yRange = yMax - yMin;
    const width = 1000;
    const height = 360;
    const baseY = height;
    const getX = (roundIndex: number) => (roundIndex / roundsCount) * width;
    const getY = (val: number) => height - ((val - yMin) / yRange) * height;

    const points = match.players.map((_, pIdx) =>
      history.map((row, rIdx) => ({
        playerIndex: pIdx,
        roundIndex: rIdx,
        value: row[pIdx],
        x: getX(rIdx),
        y: getY(row[pIdx]),
      }))
    );

    const paths = points.map((playerPoints) =>
      playerPoints.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    );
    const areas = points.map((playerPoints) => {
      const line = playerPoints.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
      const last = playerPoints[playerPoints.length - 1];
      const first = playerPoints[0];
      return `${line} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
    });

    const leadChanges: { x: number; y: number; roundIndex: number; leader: number }[] = [];
    let previousLeader: number | null = null;
    history.forEach((row, rIdx) => {
      const high = Math.max(...row);
      const leaders = row.map((value, i) => (value === high ? i : -1)).filter((i) => i >= 0);
      const leader = leaders.length === 1 ? leaders[0] : null;
      if (leader !== null && previousLeader !== null && leader !== previousLeader) {
        leadChanges.push({ x: getX(rIdx), y: getY(row[leader]), roundIndex: rIdx, leader });
      }
      if (leader !== null) previousLeader = leader;
    });

    return { width, height, getY, points, paths, areas, leadChanges };
  }, [match]);

  if (!chart) return null;

  return (
    <div className="card mb-3 overflow-hidden p-3 hide-on-share">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span>{match.rounds.length} rounds</span>
        {active ? (
          <span className="truncate rounded-full bg-slate-100 px-2 py-1 normal-case tracking-normal text-slate-700 dark:bg-white/10 dark:text-slate-200">
            {match.players[active.playerIndex]} · R{active.roundIndex}: {active.value}
          </span>
        ) : (
          <span>Match Timeline</span>
        )}
      </div>

      <div className="relative h-36 w-full">
        {active && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-950 px-2 py-1 text-[10px] font-bold text-white shadow-lg"
            style={{ left: `${(active.x / chart.width) * 100}%`, top: `${(active.y / chart.height) * 100}%` }}
          >
            {match.players[active.playerIndex]}: {active.value}
          </div>
        )}
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
          <defs>
            {match.players.map((_, pIdx) => (
              <linearGradient key={pIdx} id={`area-${match.id}-${pIdx}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={COLORS[pIdx % COLORS.length]} stopOpacity="0.22" />
                <stop offset="100%" stopColor={COLORS[pIdx % COLORS.length]} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          <line
            x1="0"
            y1={chart.getY(0)}
            x2={chart.width}
            y2={chart.getY(0)}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeDasharray="10, 10"
            vectorEffect="non-scaling-stroke"
            strokeWidth="1"
          />

          {chart.areas.map((area, pIdx) => (
            <path key={`area-${pIdx}`} d={area} fill={`url(#area-${match.id}-${pIdx})`} />
          ))}

          {chart.paths.map((path, pIdx) => (
            <motion.path
              key={pIdx}
              d={path}
              fill="none"
              stroke={COLORS[pIdx % COLORS.length]}
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.55 }}
              animate={{ pathLength: 1, opacity: 0.95 }}
              transition={{ duration: 0.7, delay: pIdx * 0.08, ease: 'easeOut' }}
            />
          ))}

          {chart.leadChanges.map((change) => (
            <g key={`${change.roundIndex}-${change.leader}`} transform={`translate(${change.x} ${change.y})`}>
              <circle r="15" fill="rgba(255,255,255,0.9)" stroke={COLORS[change.leader % COLORS.length]} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <foreignObject x="-8" y="-8" width="16" height="16">
                <RotateCw className="h-4 w-4 animate-lead-change" style={{ color: COLORS[change.leader % COLORS.length] }} />
              </foreignObject>
            </g>
          ))}

          {chart.points.flat().map((point) => (
            <circle
              key={`${point.playerIndex}-${point.roundIndex}`}
              cx={point.x}
              cy={point.y}
              r={active?.playerIndex === point.playerIndex && active.roundIndex === point.roundIndex ? 7 : 4}
              fill={COLORS[point.playerIndex % COLORS.length]}
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer stroke-white transition-all dark:stroke-[#1a1915]"
              strokeWidth="2"
              onMouseEnter={() => setActive(point)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(point)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
