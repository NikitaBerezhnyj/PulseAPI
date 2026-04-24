import React, { useState, useRef, useEffect } from "react";
import { IHttpRequest } from "../../types/http";
import { Pencil, Trash2 } from "lucide-react";
import styles from "../../styles/components/sidebar/RequestItem.module.css";
import { useHotKey } from "../../hooks/useHotKey";

interface RequestItemProps {
  request: IHttpRequest;
  groupId: string | null;
  onClick?: (request: IHttpRequest) => void;
  onRename?: (request: IHttpRequest, newName: string) => void;
  onDelete?: (request: IHttpRequest) => void;
  onDragStart?: (requestId: string, fromGroupId: string | null, x: number, y: number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isGrouped?: boolean;
  autoEdit?: boolean;
  onEditComplete?: () => void;
}

const DRAG_THRESHOLD = 5;

const RequestItem: React.FC<RequestItemProps> = ({
  request,
  groupId,
  onClick,
  onRename,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
  isGrouped = false,
  autoEdit,
  onEditComplete
}) => {
  const method = request.request.method.toUpperCase();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(request.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
  const draggingStartedRef = useRef(false);

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

  useEffect(() => {
    if (autoEdit) {
      setIsEditing(true);
      setEditName(request.name);
    }
  }, [autoEdit, request.name]);

  const handleClick = () => {
    if (!isEditing && !draggingStartedRef.current && onClick) {
      onClick(request);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const startRename = () => {
    setIsEditing(true);
    setEditName(request.name);
    setContextMenu(null);
  };

  const confirmRename = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== request.name && onRename) {
      onRename(request, trimmedName);
    }
    setIsEditing(false);
    setEditName(request.name);
    if (autoEdit && onEditComplete) onEditComplete();
  };

  const cancelRename = () => {
    setIsEditing(false);
    setEditName(request.name);
    if (autoEdit && onEditComplete) onEditComplete();
  };

  const handleDelete = () => {
    if (onDelete) onDelete(request);
    setContextMenu(null);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        confirmRename();
      }
    };
    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isEditing, editName]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    if (e.button !== 0) return;
    mouseDownRef.current = { x: e.clientX, y: e.clientY };
    draggingStartedRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!mouseDownRef.current) return;
      const dx = moveEvent.clientX - mouseDownRef.current.x;
      const dy = moveEvent.clientY - mouseDownRef.current.y;
      if (!draggingStartedRef.current && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        draggingStartedRef.current = true;
        onDragStart?.(request.id, groupId, moveEvent.clientX, moveEvent.clientY);
      }
    };

    const handleMouseUp = () => {
      mouseDownRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (draggingStartedRef.current) {
        onDragEnd?.();
      }
      setTimeout(() => {
        draggingStartedRef.current = false;
      }, 0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <>
      <div
        className={`${styles.item} ${isGrouped ? styles.grouped : styles.ungrouped} ${
          isEditing ? styles.editing : ""
        }`}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <span className={`${styles.method} ${styles[method]}`}>{method}</span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className={styles.nameInput}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={styles.name}>{request.name}</span>
        )}
      </div>
      {contextMenu && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className={styles.menuItem} onClick={startRename}>
            <Pencil size={14} />
            <span>Rename</span>
          </button>
          <button className={`${styles.menuItem} ${styles.danger}`} onClick={handleDelete}>
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </>
  );
};

export default RequestItem;
