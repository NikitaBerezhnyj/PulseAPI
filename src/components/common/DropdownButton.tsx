import { useEffect, useRef, useState } from "react";
import styles from "../../styles/components/common/DropdownButton.module.css";

type Option = {
  label: string;
  value: string;
};

interface DropdownButtonProps {
  label: string;
  options: Option[];
  onChange: (value: string) => void;
  onClick?: () => void;
  disabled?: boolean;
}

export function DropdownButton({
  label,
  options,
  onChange,
  onClick,
  disabled = false
}: DropdownButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (value: string) => {
    onChange(value);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button disabled={disabled} onClick={onClick} className={styles.mainButton}>
        {label}
      </button>

      <button disabled={disabled} onClick={() => setOpen(v => !v)} className={styles.arrowButton}>
        ▼
      </button>

      {open && (
        <div className={styles.menu}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={styles.menuItem}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
