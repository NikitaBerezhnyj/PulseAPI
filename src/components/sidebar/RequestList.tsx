import React from "react";
import { IHttpGroup } from "../../types/groups";
import GroupItem from "./GroupItem";
import RequestItem from "./RequestItem";
import DropZone from "./DropZone";
import styles from "../../styles/components/sidebar/RequestList.module.css";
import { IHttpRequest } from "../../types/http";
import { useDragAndDrop } from "../../hooks/useDragAndDrop";
import DragGhost from "./DragGhost";

const METHOD_ORDER = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"] as const;

interface RequestListProps {
  groups: IHttpGroup[];
  onGroupRename?: (group: IHttpGroup, newName: string) => void;
  onGroupDelete?: (group: IHttpGroup) => void;
  newlyCreatedGroupId: string | null;
  onGroupEditComplete: () => void;
  onRequestClick?: (request: IHttpRequest) => void;
  onCreateRequest?: (group: IHttpGroup) => void;
  onRequestRename?: (request: IHttpRequest, newName: string) => void;
  onRequestDelete?: (request: IHttpRequest) => void;
  newlyCreatedRequestId: string | null;
  onRequestEditComplete: () => void;
  onMoveRequest?: (requestId: string, fromGroupId: string | null, toGroupId: string | null) => void;
}

const RequestList: React.FC<RequestListProps> = ({
  groups,
  onCreateRequest,
  onGroupRename,
  onGroupDelete,
  newlyCreatedGroupId,
  onGroupEditComplete,
  onRequestClick,
  onRequestRename,
  onRequestDelete,
  newlyCreatedRequestId,
  onRequestEditComplete,
  onMoveRequest
}) => {
  const { dragStateRef, isDragging, startDrag, endDrag } = useDragAndDrop();

  const handleDrop = (toGroupId: string | null) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    if (drag.fromGroupId !== toGroupId) {
      onMoveRequest?.(drag.requestId, drag.fromGroupId, toGroupId);
    }
    endDrag();
  };

  const sortGroupsByName = (a: IHttpGroup, b: IHttpGroup) => {
    if (a.name === null) return -1;
    if (b.name === null) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  };

  const sortRequests = (a: IHttpRequest, b: IHttpRequest) => {
    const methodIndexA = METHOD_ORDER.indexOf(a.request.method);
    const methodIndexB = METHOD_ORDER.indexOf(b.request.method);
    if (methodIndexA !== methodIndexB) return methodIndexA - methodIndexB;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  };

  const sortedData = React.useMemo(() => {
    const ungroupedGroup = groups.find(g => g.name === null);
    const ungroupedGroupId = ungroupedGroup?.id ?? null;
    const ungroupedRequests = (ungroupedGroup?.requests ?? []).slice().sort(sortRequests);
    const namedGroups = groups
      .filter(g => g.name !== null)
      .slice()
      .sort(sortGroupsByName)
      .map(group => ({ ...group, requests: [...group.requests].sort(sortRequests) }));
    return { ungroupedRequests, namedGroups, ungroupedGroupId };
  }, [groups]);

  const { ungroupedRequests, namedGroups, ungroupedGroupId } = sortedData;

  return (
    <div className={styles.container}>
      {ungroupedRequests.length > 0 || isDragging ? (
        <div className={styles.ungroupedGroup}>
          <div className={styles.ungroupedRequests}>
            {ungroupedRequests.map((req, idx) => (
              <RequestItem
                key={idx}
                request={req}
                groupId={ungroupedGroupId}
                onClick={onRequestClick}
                onRename={onRequestRename}
                onDelete={onRequestDelete}
                onDragStart={startDrag}
                onDragEnd={endDrag}
                isDragging={isDragging}
                isGrouped={false}
                autoEdit={newlyCreatedRequestId === req.id}
                onEditComplete={onRequestEditComplete}
              />
            ))}

            <DropZone
              targetGroupId={ungroupedGroupId}
              isDragging={isDragging}
              onDrop={handleDrop}
              label="Move to ungrouped"
            />
          </div>
        </div>
      ) : null}

      {namedGroups.map((group, idx) => (
        <GroupItem
          key={`group-${idx}-${group.name}`}
          group={group}
          onCreateRequest={onCreateRequest}
          onGroupRename={onGroupRename}
          onGroupDelete={onGroupDelete}
          newlyCreatedGroupId={newlyCreatedGroupId}
          onGroupEditComplete={onGroupEditComplete}
          onRequestClick={onRequestClick}
          onRequestRename={onRequestRename}
          onRequestDelete={onRequestDelete}
          newlyCreatedRequestId={newlyCreatedRequestId}
          onRequestEditComplete={onRequestEditComplete}
          isDragging={isDragging}
          onRequestDragStart={startDrag}
          onRequestDragEnd={endDrag}
          onDrop={handleDrop}
        />
      ))}

      {isDragging && dragStateRef.current && (
        <DragGhost dragState={dragStateRef.current} groups={groups} />
      )}
    </div>
  );
};

export default RequestList;
