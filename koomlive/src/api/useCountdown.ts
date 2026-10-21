import { useEffect, useState } from "react";

/** Whole seconds until `targetIso`, re-rendering every second. null if no target. */
export function useCountdown(targetIso?: string): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  if (!targetIso) return null;
  return Math.max(0, Math.ceil((Date.parse(targetIso) - now) / 1000));
}

export function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}