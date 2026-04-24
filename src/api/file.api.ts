import { invoke } from "@tauri-apps/api/tauri";

export function loadHttpFile(path: string) {
  return invoke<void>("load_http_file", { path });
}

export function saveHttpFile(path: string) {
  return invoke<void>("save_http_file", { path });
}

export function tryRestoreRecentFile() {
  return invoke<string | null>("restore_recent_file");
}

export function clearRecentFile() {
  return invoke<void>("clear_recent_file");
}
