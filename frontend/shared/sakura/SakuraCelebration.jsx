import { useEffect, useMemo } from "react";

const PETALS = 16;

/**
 * Success effect: petals burst outwards and a message appears.
 * Render it when `show` is true; it calls `onDone` after `duration` ms.
 */
export default function SakuraCelebration({
  show,
  onDone,
  message = "Ваш праздник начинает расцветать!",
  motion = true,
  duration = 3200,
}) {
  const petals = useMemo(
    () => Array.from({ length: PETALS }, (_, i) => ({
      id: i,
      style: {
        "--angle": `${(360 / PETALS) * i + Math.random() * 14}deg`,
        "--dist": `${110 + Math.random() * 120}px`,
        "--spin": `${180 + Math.random() * 360}deg`,
        "--size": `${12 + Math.random() * 10}px`,
      },
    })),
    [show]
  );

  useEffect(() => {
    if (!show) return undefined;
    const timer = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(timer);
  }, [show, duration, onDone]);

  if (!show) return null;

  return (
    <div className="sakura-celebration" role="status" aria-live="polite" onClick={() => onDone?.()}>
      {motion && (
        <div className="sakura-burst" aria-hidden="true">
          {petals.map((petal) => (
            <span key={petal.id} className="sakura-burst-petal" style={petal.style} />
          ))}
        </div>
      )}
      <p className="sakura-celebration-message">🌸 {message}</p>
    </div>
  );
}
