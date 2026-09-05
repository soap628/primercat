"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserSessionStorage, clearSessionWorkspace, readSessionWorkspace, writeSessionWorkspace } from "./session-workspace";

/** Restore after hydration and only then persist; first-render defaults cannot overwrite a saved result. */
export function useSessionWorkspace<T>(
  key: string,
  snapshot: T,
  restore: (saved: T) => void,
  validate: (value: unknown) => value is T,
) {
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const restoreRef = useRef(restore);
  const validateRef = useRef(validate);
  restoreRef.current = restore;
  validateRef.current = validate;

  useEffect(() => {
    const saved = readSessionWorkspace(key, validateRef.current, browserSessionStorage());
    if (saved !== null) restoreRef.current(saved);
    setRestored(saved !== null);
    setReadyKey(key);
  }, [key]);

  useEffect(() => {
    if (readyKey !== key) return;
    setStorageAvailable(writeSessionWorkspace(key, snapshot, browserSessionStorage()));
  }, [key, readyKey, snapshot]);

  const clear = useCallback(() => {
    clearSessionWorkspace(key, browserSessionStorage());
    setRestored(false);
  }, [key]);

  return { ready: readyKey === key, restored, storageAvailable, clear };
}
