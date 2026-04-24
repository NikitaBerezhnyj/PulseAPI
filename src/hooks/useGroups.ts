import { useCallback } from "react";
import { IHttpGroup } from "../types/groups";
import { log } from "../api/log.api";
import { createGroup, renameGroup, deleteGroup } from "../api/groups.api";

interface IUseGroupsProps {
  reload: () => Promise<void>;
}

export function useGroups({ reload }: IUseGroupsProps) {
  const create = useCallback(
    async (name?: string) => {
      try {
        const groupId = await createGroup(name);
        await reload();
        return groupId;
      } catch (err) {
        log(`Failed to create group: ${err}`, "error");
        throw err;
      }
    },
    [reload]
  );

  const rename = useCallback(
    async (group: IHttpGroup, newName: string) => {
      try {
        log(`Renaming group ${group.id} to ${newName}`);
        await renameGroup(group.id, newName);
        await reload();
      } catch (err) {
        log("Failed to rename group", "error");
        throw err;
      }
    },
    [reload]
  );

  const remove = useCallback(
    async (group: IHttpGroup) => {
      try {
        await deleteGroup(group.id);
        await reload();
      } catch (err) {
        log("Failed to delete group", "error");
        throw err;
      }
    },
    [reload]
  );

  return {
    create,
    rename,
    remove
  };
}
