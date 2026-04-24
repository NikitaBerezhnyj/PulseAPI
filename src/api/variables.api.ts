import { invoke } from "@tauri-apps/api/tauri";

export function getAllVariables() {
  return invoke<Record<string, string>>("get_all_variables");
}

export function addVariable(key: string, value: string) {
  return invoke<void>("add_variable", { key, value });
}

export function updateVariable(key: string, value: string) {
  return invoke<void>("update_variable", { key, value });
}

export function deleteVariable(key: string) {
  return invoke<void>("delete_variable", { key });
}
