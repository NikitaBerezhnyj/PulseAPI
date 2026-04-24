import { useState, useCallback, useEffect, useRef } from "react";

type ResizeDirection = "horizontal" | "vertical";

interface UseResizableOptions {
  direction?: ResizeDirection;
  minSize?: number;
  maxSize?: number;
  defaultSize?: number;
}

export function useResizable({
  direction = "horizontal",
  minSize = 200,
  maxSize = 600,
  defaultSize = 260
}: UseResizableOptions = {}) {
  const [size, setSize] = useState(defaultSize);
  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(defaultSize);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startPosRef.current = direction === "horizontal" ? e.clientX : e.clientY;
      startSizeRef.current = size;
    },
    [size, direction]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === "horizontal" ? e.clientX : e.clientY;
      const delta =
        direction === "horizontal"
          ? currentPos - startPosRef.current
          : startPosRef.current - currentPos;

      const newSize = Math.min(Math.max(startSizeRef.current + delta, minSize), maxSize);
      setSize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minSize, maxSize, direction]);

  return { size, isResizing, handleMouseDown };
}
