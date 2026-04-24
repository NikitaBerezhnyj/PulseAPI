import { useEffect } from "react";

type KeyCallbackMap = {
  [key: string]: (event: KeyboardEvent) => void;
};

export const useHotKey = (
  keyCallbacks: KeyCallbackMap,
  ref?: React.RefObject<HTMLElement | null>,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (!ref?.current || ref.current.contains(e.target as Node)) {
        const callback = keyCallbacks[e.key];
        if (callback) callback(e);
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, [keyCallbacks, ref, enabled]);
};
