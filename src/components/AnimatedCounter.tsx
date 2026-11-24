import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  durationMs?: number;
}

export function AnimatedCounter({
  target,
  suffix = '',
  durationMs = 1300,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(target);
  const hasAnimated = useRef(false);
  const elRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = elRef.current;
    if (!node) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setDisplay(target);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const ratio = Math.min(1, elapsed / durationMs);
            const eased = 1 - Math.pow(1 - ratio, 3);
            setDisplay(Math.round(target * eased));
            if (ratio < 1) {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return (
    <span ref={elRef} className="tabular-nums">
      {display.toLocaleString('en-US')}
      {suffix}
    </span>
  );
}
