import { memo, useEffect, useMemo, useState } from "react";

function random(min, max) {
  return min + Math.random() * (max - min);
}

function isSmallScreen() {
  return typeof window !== "undefined" && window.matchMedia?.("(max-width: 600px)").matches;
}

/** Petal parameters are generated once per count — no re-renders while falling. */
function createPetals(count) {
  return Array.from({ length: count }, (_, index) => {
    const duration = random(11, 22);
    return {
      id: index,
      blink: Math.random() < 0.3,
      style: {
        "--x": `${random(-5, 100).toFixed(2)}vw`,
        "--size": `${random(10, 22).toFixed(1)}px`,
        "--alpha": random(0.45, 0.95).toFixed(2),
        "--dur": `${duration.toFixed(2)}s`,
        "--delay": `${(-random(0, duration)).toFixed(2)}s`,
        "--drift": `${random(-14, 18).toFixed(1)}vw`,
        "--amp": `${random(18, 46).toFixed(0)}px`,
        "--sway-dur": `${random(2.6, 4.8).toFixed(2)}s`,
        "--rot": `${random(160, 420).toFixed(0)}deg`,
      },
    };
  });
}

/**
 * Background layer of falling sakura petals (pure CSS keyframes).
 * Props: enabled, count, speed, opacity.
 */
function SakuraAnimation({ enabled = true, count = 24, speed = 1, opacity = 0.8 }) {
  const effectiveCount = useMemo(
    () => Math.max(4, Math.round(isSmallScreen() ? count * 0.6 : count)),
    [count]
  );
  const petals = useMemo(() => createPetals(effectiveCount), [effectiveCount]);

  if (!enabled) return null;

  return (
    <div
      className="sakura-petals"
      aria-hidden="true"
      style={{ "--sakura-speed": speed, "--sakura-opacity": opacity }}
    >
      {petals.map((petal) => (
        <span
          key={petal.id}
          className={petal.blink ? "sakura-petal sakura-petal--blink" : "sakura-petal"}
          style={petal.style}
        >
          <i />
        </span>
      ))}
    </div>
  );
}

export default memo(SakuraAnimation);

/** A few petals sweep across the screen while the interface fades in. */
export function SakuraIntro({ enabled = true, duration = 1600 }) {
  const [visible, setVisible] = useState(enabled);
  const petals = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      id: i,
      style: {
        "--y": `${random(5, 85).toFixed(1)}vh`,
        "--size": `${random(14, 26).toFixed(0)}px`,
        "--delay": `${random(0, 0.5).toFixed(2)}s`,
        "--rot": `${random(200, 540).toFixed(0)}deg`,
        "--rise": `${random(-25, 10).toFixed(0)}vh`,
      },
    })),
    []
  );

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [enabled, duration]);

  if (!enabled || !visible) return null;

  return (
    <div className="sakura-intro" aria-hidden="true">
      {petals.map((petal) => (
        <span key={petal.id} className="sakura-intro-petal" style={petal.style} />
      ))}
    </div>
  );
}
