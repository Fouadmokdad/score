import { Match } from '../types';

const COLORS = [
  '#10b981', // emerald-500
  '#f43f5e', // rose-500
  '#3b82f6', // blue-500
  '#eab308', // yellow-500
];

export function MatchChart({ match }: { match: Match }) {
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
  const yMin = min - range * 0.1;
  const yMax = max + range * 0.1;
  const yRange = yMax - yMin;

  const width = 1000;
  const height = 400;

  const getX = (roundIndex: number) => (roundIndex / roundsCount) * width;
  const getY = (val: number) => height - ((val - yMin) / yRange) * height;

  return (
    <div className="card mb-3 p-3 overflow-hidden hide-on-share relative">
      <div className="mb-2 text-xs font-bold text-slate-500 text-center uppercase tracking-wider">
        Match Timeline
      </div>
      <div className="w-full relative h-32">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Zero line */}
          <line
            x1="0"
            y1={getY(0)}
            x2={width}
            y2={getY(0)}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeDasharray="10, 10"
            vectorEffect="non-scaling-stroke"
            strokeWidth="1"
          />

          {/* Paths */}
          {match.players.map((_, pIdx) => {
            const pathParts = history.map((row, rIdx) => {
              const x = getX(rIdx);
              const y = getY(row[pIdx]);
              return `${rIdx === 0 ? 'M' : 'L'} ${x} ${y}`;
            });

            return (
              <path
                key={pIdx}
                d={pathParts.join(' ')}
                fill="none"
                stroke={COLORS[pIdx % COLORS.length]}
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="opacity-90 transition-all duration-500"
              />
            );
          })}

          {/* Dots */}
          {match.players.map((_, pIdx) => {
            return history.map((row, rIdx) => (
              <circle
                key={`${pIdx}-${rIdx}`}
                cx={getX(rIdx)}
                cy={getY(row[pIdx])}
                r="4"
                fill={COLORS[pIdx % COLORS.length]}
                vectorEffect="non-scaling-stroke"
                className="stroke-white dark:stroke-[#1a1915]"
                strokeWidth="2"
              />
            ));
          })}
        </svg>
      </div>
    </div>
  );
}
