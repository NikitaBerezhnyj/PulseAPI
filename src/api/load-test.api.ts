import { invoke } from "@tauri-apps/api/tauri";
import { ILoadTestResultRaw } from "../types/load-test";

export function executeLoadTest(
  requestId: string,
  totalRequests: number,
  durationSecs: number,
  concurrent: number
) {
  return invoke<ILoadTestResultRaw>("execute_load_test", {
    requestId,
    totalRequests,
    durationSecs,
    concurrent
  });
}
