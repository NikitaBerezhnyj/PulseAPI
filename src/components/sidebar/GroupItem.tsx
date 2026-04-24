import React, { useEffect, useRef, useState } from "react";
import { IHttpGroup } from "../../types/groups";
import RequestItem from "./RequestItem";
import DropZone from "./DropZone";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import styles from "../../styles/components/sidebar/GroupItem.module.css";
import { IHttpRequest } from "../../types/http";
import { useHotKey } from "../../hooks/useHotKey";

interface GroupItemProps {
  group: IHttpGroup;
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
  isDragging: boolean;
  onRequestDragStart: (requestId: string, fromGroupId: string | null, x: number, y: number) => void;
  onRequestDragEnd: () => void;
  onDrop: (toGroupId: string | null) => void;
}

const GroupItem: React.FC<GroupItemProps> = ({
  group,
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
  isDragging,
  onRequestDragStart,
  onRequestDragEnd,
  onDrop
}) => {
  const [expanded, setExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name ?? "");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useHotKey(
    {
      Enter: e => {
        e.preventDefault();
        confirmRename();
      },
      Escape: e => {
        e.preventDefault();
        cancelRename();
      }
    },
    inputRef,
    isEditing
  );

  const toggleExpanded = () => setExpanded(prev => !prev);

  useEffect(() => {
    if (newlyCreatedGroupId === group.id) {
      setIsEditing(true);
      setEditName(group.name ?? "");
    }
  }, [newlyCreatedGroupId, group.id, group.name]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const menuHeight = 100;
    const offset = 10;
    let posX = e.clientX;
    let posY = e.clientY;
    const viewportHeight = window.innerHeight;
    if (posY + menuHeight + offset > viewportHeight) {
      posY = viewportHeight - menuHeight - offset;
    }
    const viewportWidth = window.innerWidth;
    const menuWidth = 150;
    if (posX + menuWidth + offset > viewportWidth) {
      posX = viewportWidth - menuWidth - offset;
    }
    setContextMenu({ x: posX, y: posY });
  };

  const handleRenameClick = () => {
    setIsEditing(true);
    setEditName(group.name ?? "");
    setContextMenu(null);
  };

  const confirmRename = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== group.name) {
      onGroupRename?.(group, trimmedName);
    }
    setIsEditing(false);
    if (newlyCreatedGroupId === group.id) {
      onGroupEditComplete?.();
    }
  };

  const cancelRename = () => {
    setIsEditing(false);
    setEditName(group.name ?? "");
    if (newlyCreatedGroupId === group.id) {
      onGroupEditComplete?.();
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className={styles.group}>
      <div className={styles.header} onClick={toggleExpanded} onContextMenu={handleContextMenu}>
        {isEditing ? (
          <input
            ref={inputRef}
            className={styles.titleInput}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onClick={e => e.stopPropagation()}
            onBlur={confirmRename}
          />
        ) : (
          <span className={styles.title} title={group.name ?? ""}>
            {group.name}
          </span>
        )}
        {expanded ? <ChevronUp className={styles.icon} /> : <ChevronDown className={styles.icon} />}
      </div>

      {expanded && (
        <div className={styles.requests}>
          {group.requests.map((req, idx) => (
            <RequestItem
              key={idx}
              request={req}
              groupId={group.id}
              onClick={onRequestClick}
              onRename={onRequestRename}
              onDelete={onRequestDelete}
              onDragStart={onRequestDragStart}
              onDragEnd={onRequestDragEnd}
              isGrouped={true}
              autoEdit={newlyCreatedRequestId === req.id}
              onEditComplete={onRequestEditComplete}
            />
          ))}
          <DropZone
            targetGroupId={group.id}
            isDragging={isDragging}
            onDrop={onDrop}
            label={`Move to ${group.name ?? "group"}`}
          />
        </div>
      )}

      {!expanded && (
        <DropZone
          targetGroupId={group.id}
          isDragging={isDragging}
          onDrop={onDrop}
          label={`Move to ${group.name ?? "group"}`}
        />
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className={styles.menuItem}
            onClick={() => {
              onCreateRequest?.(group);
              setContextMenu(null);
            }}
          >
            <Plus size={14} />
            <span>New request</span>
          </button>
          <button className={styles.menuItem} onClick={handleRenameClick}>
            <Pencil size={14} />
            <span>Rename group</span>
          </button>
          <button
            className={`${styles.menuItem} ${styles.danger}`}
            onClick={() => {
              onGroupDelete?.(group);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            <span>Delete group</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupItem;
