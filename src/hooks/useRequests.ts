import { useState, useCallback } from "react";
import { IHttpGroup } from "../types/groups";
import { IHttpRequest } from "../types/http";
import { log } from "../api/log.api";
import {
  getAllRequests,
  renameRequest,
  updateRequest,
  deleteRequest,
  createRequest,
  executeRequest,
  moveRequest
} from "../api/requests.api";

export function useRequests() {
  const [requests, setRequests] = useState<IHttpGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = await getAllRequests();
      const structure: IHttpGroup[] =
        typeof requests === "string" ? JSON.parse(requests) : requests;

      setRequests(structure);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load requests";
      setError(message);
      log(message, "error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      const requests = await getAllRequests();
      const structure: IHttpGroup[] =
        typeof requests === "string" ? JSON.parse(requests) : requests;

      setRequests(structure);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reload requests";
      log(message, "error");
      throw err;
    }
  }, []);

  const create = useCallback(
    async (groupId?: string) => {
      const targetGroupId = groupId ?? null;

      try {
        const newRequestId = await createRequest(targetGroupId, "New Request", "GET", "");
        await reload();
        return newRequestId;
      } catch (err) {
        log(`Failed to create request: ${err}`, "error");
        throw err;
      }
    },
    [reload]
  );

  const rename = useCallback(
    async (request: IHttpRequest, newName: string) => {
      try {
        await renameRequest(request.id.toString(), newName);
        await reload();
      } catch (err) {
        log("Failed to rename request", "error");
        throw err;
      }
    },
    [reload]
  );

  const update = useCallback(
    async (request: IHttpRequest) => {
      try {
        await updateRequest(request.id.toString(), request);
        await reload();
      } catch (err) {
        log(`Failed to update request: ${err}`, "error");
        throw err;
      }
    },
    [reload]
  );

  const move = useCallback(
    async (fromGroupId: string | null, requestId: string, toGroupId: string | null) => {
      try {
        await moveRequest(fromGroupId, requestId, toGroupId);
        await reload();
      } catch (err) {
        log(`Failed to move request: ${err}`, "error");
        throw err;
      }
    },
    [reload]
  );

  const remove = useCallback(
    async (request: IHttpRequest) => {
      try {
        await deleteRequest(request.id);
        await reload();
      } catch (err) {
        log("Failed to delete request", "error");
        throw err;
      }
    },
    [reload]
  );

  const execute = useCallback(async (request: IHttpRequest) => {
    try {
      const response = await executeRequest(request.id);
      return response;
    } catch (err) {
      log("Failed to execute request", "error");
      throw err;
    }
  }, []);

  return {
    requests,
    loading,
    error,
    load,
    reload,
    create,
    rename,
    update,
    move,
    remove,
    execute,
    clearError: () => setError(null)
  };
}
