import React from "react";
import { IHttpGroup } from "../../types/groups";
import styles from "../../styles/components/sidebar/DropGhost.module.css";

function DragGhost({
  dragState,
  groups
}: {
  dragState: { requestId: string; fromGroupId: string | null };
  groups: IHttpGroup[];
}) {
  const [pos, setPos] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const req = groups.flatMap(g => g.requests).find(r => r.id === dragState.requestId);

  if (!req) return null;

  return (
    <div
      className={styles.dragGhost}
      style={{
        left: pos.x + 12,
        top: pos.y - 10
      }}
    >
      {req.request.method} {req.name}
    </div>
  );
}

export default DragGhost;
