export interface IDuration {
  secs: number;
  nanos: number;
}

export interface ILoadTestProgressRaw {
  completed: number;
  successful: number;
  failed: number;
  elapsed_ms: number;
  total_requests: number;
}

export interface ILoadTestResultRaw {
  total_requests: number;
  successful: number;
  failed: number;
  total_duration: IDuration;
  avg_response_time: IDuration;
  min_response_time: IDuration;
  max_response_time: IDuration;
  requests_per_second: number;
  errors: string[];
  status_codes: Record<number, number>;
}

export interface ILoadTestProgress {
  completed: number;
  successful: number;
  failed: number;
  elapsedMs: number;
  totalRequests: number;
}

export interface ILoadTestResult {
  totalRequests: number;
  successful: number;
  failed: number;
  totalDurationMs: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  requestsPerSecond: number;
  errors: string[];
  statusCodes: Record<number, number>;
}
