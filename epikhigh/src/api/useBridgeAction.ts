import { useCallback, useRef, useState } from "react";
import { navigate } from "../routing";
import { describeError } from "./bridgeClient";

export function useBridgeAction() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const run = useCallback(async (key: string, action: () => Promise<unknown>, nextHash: string) => {
    if (busy.current) return;
    busy.current = true;
    setPendingKey(key);
    setError(null);
    try {
      await action();
      navigate(nextHash);
    } catch (err) {
      console.error(`[bridge] ${key} failed`, err);
      setError(describeError(err));
    } finally {
      busy.current = false;
      setPendingKey(null);
    }
  }, []);

  return { pendingKey, error, run };
}