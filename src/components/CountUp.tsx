import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  /** Animation duration in ms */
  duration?: number;
  className?: string;
  /** Optional formatter (e.g. for thousands separator) */
  format?: (n: number) => string;
}

/**
 * Animates from previous value → new value when `value` changes.
 * Uses requestAnimationFrame and easeOutQuart easing.
 */
export function CountUp({ value, duration = 600, className, format }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - t, 4);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  return <span className={className}>{format ? format(display) : display}</span>;
}
