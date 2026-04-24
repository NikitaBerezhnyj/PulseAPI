import { useState, useCallback } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type {
  IDuration,
  ILoadTestProgress,
  ILoadTestProgressRaw,
  ILoadTestResult,
  ILoadTestResultRaw
} from "../types/load-test";
import { log } from "../api/log.api";
import { executeLoadTest as executeLoadTestApi } from "../api/load-test.api";

export function useLoadTest() {
  const [progress, setProgress] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ILoadTestResult | null>(null);

  function durationToMs(duration: IDuration): number {
    return duration.secs * 1000 + duration.nanos / 1_000_000;
  }

  function mapProgress(progress: ILoadTestProgressRaw): ILoadTestProgress {
    return {
      completed: progress.completed,
      successful: progress.successful,
      failed: progress.failed,
      elapsedMs: progress.elapsed_ms,
      totalRequests: progress.total_requests
    };
  }

  function mapResult(result: ILoadTestResultRaw): ILoadTestResult {
    return {
      totalRequests: result.total_requests,
      successful: result.successful,
      failed: result.failed,
      totalDurationMs: durationToMs(result.total_duration),
      avgResponseTimeMs: durationToMs(result.avg_response_time),
      minResponseTimeMs: durationToMs(result.min_response_time),
      maxResponseTimeMs: durationToMs(result.max_response_time),
      requestsPerSecond: result.requests_per_second,
      errors: result.errors,
      statusCodes: result.status_codes
    };
  }

  const execute = useCallback(
    async (requestId: string, totalRequests: number, durationSecs?: number, concurrent = 1) => {
      setRunning(true);
      setProgress(0);
      setError(null);
      setResult(null);

      let unlisten: UnlistenFn | null = null;

      try {
        unlisten = await listen<ILoadTestProgressRaw>("load-test-progress", event => {
          const mapped = mapProgress(event.payload);
          const newProgress = mapped.completed / mapped.totalRequests;
          console.log(`Progress: ${(newProgress * 100).toFixed(0)}%`, mapped);
          setProgress(newProgress);
        });

        const rawResult = await executeLoadTestApi(
          requestId,
          totalRequests,
          durationSecs || 10,
          concurrent
        );

        console.log("Raw result from backend:", rawResult);

        if (!rawResult.total_duration || !rawResult.avg_response_time) {
          throw new Error("Invalid result structure from backend");
        }

        const mappedResult = mapResult(rawResult);

        setProgress(1);

        await new Promise(resolve => setTimeout(resolve, 100));

        setResult(mappedResult);

        return mappedResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to execute load test";
        setError(message);
        log(message, "error");
        throw err;
      } finally {
        if (unlisten) {
          unlisten();
        }

        setRunning(false);
      }
    },
    []
  );

  return {
    progress,
    running,
    error,
    result,
    execute,
    clearError: () => setError(null)
  };
}
