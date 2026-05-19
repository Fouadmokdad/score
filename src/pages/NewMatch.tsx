import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayerSetup } from '../components/PlayerSetup';
import { type GameKind } from '../types';
import { useMatches } from '../store/matches';
import { useState } from 'react';
import { copy, gameText } from '../i18n';
import { useSettings } from '../store/settings';
import { TARNEEB_DEFAULT_TARGET, TARNEEB_TARGETS } from '../logic/tarneeb';

const COUNT: Record<GameKind, number> = {
  likha: 4,
  'hand-solo': 2,
  'hand-partners': 4,
  trix: 4,
  complex: 4,
  tarneeb: 4,
  'tarneeb-400': 4,
};

export default function NewMatch() {
  const { kind } = useParams<{ kind: GameKind }>();
  const navigate = useNavigate();
  const { createMatch } = useMatches();
  const { language } = useSettings();
  const t = copy[language];
  const isPartners = kind === 'hand-partners' || kind === 'tarneeb';
  const isLikha = kind === 'likha';
  const isHandSolo = kind === 'hand-solo';
  const isTarneeb = kind === 'tarneeb';

  const [target, setTarget] = useState(101);
  const [tarneebTarget, setTarneebTarget] = useState<number>(TARNEEB_DEFAULT_TARGET);
  const [handSoloPlayers, setHandSoloPlayers] = useState(2);

  if (!kind || !(kind in COUNT)) {
    return (
      <Layout back title={t.newMatch}>
        <div className="card">{t.unknownGame}</div>
      </Layout>
    );
  }

  return (
    <Layout back title={`${t.newMatch} • ${gameText[language].labels[kind]}`}>
      <PlayerSetup
        count={isHandSolo ? handSoloPlayers : COUNT[kind]}
        labels={
          isPartners
            ? language === 'ar'
              ? ['الفريق 1 - لاعب 1', 'الفريق 2 - لاعب 1', 'الفريق 1 - لاعب 2', 'الفريق 2 - لاعب 2']
              : ['Team 1 - Player 1', 'Team 2 - Player 1', 'Team 1 - Player 2', 'Team 2 - Player 2']
            : undefined
        }
        extra={
          isLikha ? (
            <div>
              <label className="label">{t.target}</label>
              <input
                type="number"
                className="input"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </div>
          ) : isTarneeb ? (
            <div>
              <label className="label">{language === 'ar' ? 'هدف المباراة' : 'Match target'}</label>
              <div className="grid grid-cols-3 gap-2">
                {TARNEEB_TARGETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      'rounded-xl border px-3 py-2 text-sm font-bold ' +
                      (tarneebTarget === value
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-700')
                    }
                    onClick={() => setTarneebTarget(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ) : isHandSolo ? (
            <div>
              <label className="label">{language === 'ar' ? 'عدد اللاعبين' : 'Player count'}</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {[2, 3, 4, 5, 6].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={
                      'rounded-xl border px-3 py-2 text-sm font-bold ' +
                      (handSoloPlayers === count
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-700')
                    }
                    onClick={() => setHandSoloPlayers(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          ) : null
        }
        onSubmit={(names) => {
          let players = names;
          let teams: number | undefined;
          if (isPartners) {
            // teams: [Team1, Team2] from positions [0,2] and [1,3]
            players = [`${names[0]} ${language === 'ar' ? 'و' : '&'} ${names[2]}`, `${names[1]} ${language === 'ar' ? 'و' : '&'} ${names[3]}`];
            teams = 2;
          }
          const id = createMatch({
            kind,
            players,
            teams,
            config: isLikha
              ? { target, originalNames: names }
              : isTarneeb
                ? { target: tarneebTarget, originalNames: names }
              : isHandSolo
                ? { playerCount: handSoloPlayers, originalNames: names }
              : { originalNames: names },
          });
          navigate(`/match/${id}/${kind}`);
        }}
      />
    </Layout>
  );
}
