import { invoke } from "@tauri-apps/api/tauri";

export type LogLevel = "info" | "error" | "debug";

export function log(message: string, level: LogLevel = "info") {
  return invoke<void>("log", {
    message,
    level
  });
}
