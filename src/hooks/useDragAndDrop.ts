import { useCallback, useEffect, useRef, useState } from "react";

export interface DragState {
  requestId: string;
  fromGroupId: string | null;
  startX: number;
  startY: number;
}

export interface DragPosition {
  x: number;
  y: number;
}

export function useDragAndDrop() {
  const dragStateRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<DragPosition>({ x: 0, y: 0 });

  const startDrag = useCallback(
    (requestId: string, fromGroupId: string | null, startX: number, startY: number) => {
      dragStateRef.current = { requestId, fromGroupId, startX, startY };
      setDragPos({ x: startX, y: startY });
      setIsDragging(true);
    },
    []
  );

  const endDrag = useCallback(() => {
    dragStateRef.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      endDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, endDrag]);

  return { dragStateRef, isDragging, dragPos, startDrag, endDrag };
}
