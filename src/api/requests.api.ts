import { invoke } from "@tauri-apps/api/tauri";
import type { IHttpRequest, IHttpResponse } from "../types/http";

export function getAllRequests() {
  return invoke<IHttpRequest[]>("get_all_requests");
}

export function executeRequest(requestId: string) {
  return invoke<IHttpResponse>("execute_request", { requestId });
}

export function createRequest(groupId: string | null, name: string, method: string, url: string) {
  return invoke<string>("create_request", { groupId, name, method, url });
}

export function renameRequest(requestId: string, newName: string) {
  return invoke<void>("rename_request", { requestId, newName });
}

export function updateRequest(requestId: string, request: IHttpRequest) {
  return invoke<void>("update_request", { requestId, request: request.request });
}

export function moveRequest(
  fromGroupId: string | null,
  requestId: string,
  toGroupId: string | null
) {
  return invoke<void>("move_request", { fromGroupId, requestId, toGroupId });
}

export function deleteRequest(requestId: string) {
  return invoke<void>("delete_request", { requestId });
}
