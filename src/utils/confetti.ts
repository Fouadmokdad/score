import confetti from 'canvas-confetti';

/** Trigger a celebratory confetti burst when a match ends. */
export function celebrateWin() {
  const duration = 2500;
  const end = Date.now() + duration;

  // Initial big burst
  confetti({
    particleCount: 120,
    spread: 90,
    origin: { y: 0.6 },
    colors: ['#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6'],
    zIndex: 9999,
  });

  // Side cannons running for a couple seconds
  const interval = window.setInterval(() => {
    if (Date.now() > end) {
      window.clearInterval(interval);
      return;
    }
    confetti({
      particleCount: 30,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.65 },
      colors: ['#10b981', '#f59e0b', '#3b82f6', '#f43f5e'],
      zIndex: 9999,
    });
    confetti({
      particleCount: 30,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.65 },
      colors: ['#10b981', '#f59e0b', '#3b82f6', '#f43f5e'],
      zIndex: 9999,
    });
  }, 250);
}

/** Tiny confetti puff for in-app micro-events (e.g., adding a round). */
export function smallPop(originX = 0.5) {
  confetti({
    particleCount: 25,
    spread: 50,
    startVelocity: 25,
    origin: { x: originX, y: 0.7 },
    colors: ['#10b981', '#f59e0b'],
    ticks: 60,
    zIndex: 9999,
  });
}
