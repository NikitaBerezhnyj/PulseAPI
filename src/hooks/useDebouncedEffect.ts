import { useEffect, type DependencyList } from "react";

export function useDebouncedEffect(effect: () => void, deps: DependencyList, delay: number) {
  useEffect(() => {
    const timeout = setTimeout(effect, delay);
    return () => clearTimeout(timeout);
  }, deps);
}
