import { invoke } from "@tauri-apps/api/tauri";

export function createGroup(name?: string) {
  return invoke<string>("create_group", { name });
}

export function renameGroup(groupId: string, newName: string) {
  return invoke<void>("rename_group", { groupId, newName });
}

export function deleteGroup(groupId: string) {
  return invoke<void>("delete_group", { groupId });
}
