import { ReactNode, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import styles from "../../styles/components/common/CollapsibleSection.module.css";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  badge
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.section}>
      <div className={styles.header} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? (
          <ChevronDown size={16} className={styles.icon} />
        ) : (
          <ChevronRight size={16} className={styles.icon} />
        )}
        <span className={styles.title}>{title}</span>
        {badge !== undefined && badge > 0 && <span className={styles.badge}>{badge}</span>}
      </div>
      {isOpen && <div className={styles.content}>{children}</div>}
    </div>
  );
}
