import React, { useRef, useState } from "react";
import styles from "../../styles/components/sidebar/DropZone.module.css";

interface DropZoneProps {
  targetGroupId: string | null;
  isDragging: boolean;
  onDrop: (toGroupId: string | null) => void;
  label?: string;
}

const DropZone: React.FC<DropZoneProps> = ({ targetGroupId, isDragging, onDrop, label }) => {
  const [isOver, setIsOver] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={`${styles.dropZone} ${isDragging ? styles.visible : ""} ${isOver ? styles.over : ""}`}
      onMouseEnter={() => {
        if (isDragging) setIsOver(true);
      }}
      onMouseLeave={() => setIsOver(false)}
      onMouseUp={e => {
        if (!isDragging) return;
        e.stopPropagation();
        setIsOver(false);
        onDrop(targetGroupId);
      }}
    >
      <span style={{ pointerEvents: "none" }}>{isDragging ? (label ?? "Move here") : ""}</span>
    </div>
  );
};

export default DropZone;
