import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sakura-settings";

export const SAKURA_DEFAULTS = {
  enabled: true,   // falling petals on/off
  count: 24,       // number of petals (desktop; mobile uses ~60%)
  speed: 1,        // 0.5 = slower, 2 = faster
  opacity: 0.8,    // 0.2 … 1
};

export const SAKURA_LIMITS = {
  count: [6, 60],
  speed: [0.5, 2],
  opacity: [0.2, 1],
};

function clamp(value, [min, max]) {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function matchesReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Tracks the OS "reduce motion" preference live. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(matchesReducedMotion);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/**
 * Animation settings shared by Sakura components.
 * `motion` is false when the user turned animation off OR the OS asks to reduce motion.
 */
export function useSakuraSettings() {
  const reducedMotion = usePrefersReducedMotion();
  const [settings, setSettings] = useState(() => ({ ...SAKURA_DEFAULTS, ...readStored() }));

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable (private mode) — settings just won't persist */
    }
  }, [settings]);

  const update = useCallback((key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: key === "enabled" ? Boolean(value) : clamp(value, SAKURA_LIMITS[key]),
    }));
  }, []);

  return {
    ...settings,
    reducedMotion,
    motion: settings.enabled && !reducedMotion,
    update,
  };
}
