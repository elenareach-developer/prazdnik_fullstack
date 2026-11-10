import { SAKURA_LIMITS } from "./useSakuraSettings";

/** Compact settings panel: on/off, count, speed, opacity. Takes the object from useSakuraSettings(). */
export default function SakuraControls({ settings }) {
  const { enabled, count, speed, opacity, reducedMotion, update } = settings;

  return (
    <details className="sakura-controls">
      <summary>🌸 Анимация</summary>
      <div className="sakura-controls-body">
        {reducedMotion && (
          <p className="sakura-controls-note">
            В системе включено «уменьшение движения» — лепестки не падают.
          </p>
        )}
        <label className="sakura-toggle">
          <input
            type="checkbox"
            checked={enabled}
            disabled={reducedMotion}
            onChange={(event) => update("enabled", event.target.checked)}
          />
          Падающие лепестки
        </label>
        <label>
          Количество: {count}
          <input type="range" min={SAKURA_LIMITS.count[0]} max={SAKURA_LIMITS.count[1]} step="1"
            value={count} disabled={!enabled || reducedMotion}
            onChange={(event) => update("count", event.target.value)} />
        </label>
        <label>
          Скорость: {Number(speed).toFixed(1)}×
          <input type="range" min={SAKURA_LIMITS.speed[0]} max={SAKURA_LIMITS.speed[1]} step="0.1"
            value={speed} disabled={!enabled || reducedMotion}
            onChange={(event) => update("speed", event.target.value)} />
        </label>
        <label>
          Прозрачность: {Math.round(opacity * 100)}%
          <input type="range" min={SAKURA_LIMITS.opacity[0]} max={SAKURA_LIMITS.opacity[1]} step="0.05"
            value={opacity} disabled={!enabled || reducedMotion}
            onChange={(event) => update("opacity", event.target.value)} />
        </label>
      </div>
    </details>
  );
}
