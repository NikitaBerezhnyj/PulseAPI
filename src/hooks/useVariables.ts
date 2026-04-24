import { useState, useCallback } from "react";
import { log } from "../api/log.api";
import { getAllVariables, addVariable, updateVariable, deleteVariable } from "../api/variables.api";

export function useVariables() {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const vars = await getAllVariables();
      setVariables(vars);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load variables";
      setError(message);
      log(message, "error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(
    async (key: string, value: string) => {
      try {
        await addVariable(key, value);
        await load();
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add variable";
        setError(message);
        log(message, "error");
        throw err;
      }
    },
    [load]
  );

  const update = useCallback(
    async (key: string, value: string) => {
      try {
        await updateVariable(key, value);
        await load();
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update variable";
        setError(message);
        log(message, "error");
        throw err;
      }
    },
    [load]
  );

  const remove = useCallback(
    async (key: string) => {
      try {
        await deleteVariable(key);
        await load();
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete variable";
        setError(message);
        log(message, "error");
        throw err;
      }
    },
    [load]
  );

  return {
    variables,
    error,
    loading,
    load,
    add,
    update,
    remove,
    clearError: () => setError(null)
  };
}
