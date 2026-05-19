import { Match } from '../types';

export function getPlayerBadges(playerName: string, matches: Match[]) {
  const finished = matches.filter(m => m.finished && m.winnerIndex !== undefined);
  let wins = 0;
  let played = 0;
  
  finished.forEach(m => {
    if (m.players.includes(playerName)) {
      played++;
      if (m.players[m.winnerIndex!] === playerName) {
        wins++;
      }
    }
  });

  const badges: string[] = [];
  if (wins >= 5 && wins / played >= 0.6) {
    badges.push('🏆'); // Master
  }
  if (wins >= 10) {
    badges.push('👑'); // Legend
  }
  
  return badges;
}
