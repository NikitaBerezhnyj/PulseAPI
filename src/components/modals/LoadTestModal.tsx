import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import styles from "../../styles/components/modals/LoadTestModal.module.css";
import { useHotKey } from "../../hooks/useHotKey";

interface LoadTestConfig {
  totalRequests: number;
  durationSecs: number;
  concurrent: number;
}

interface LoadTestModalProps {
  isOpen: boolean;
  initialValues: LoadTestConfig;
  onClose: () => void;
  onSave: (values: LoadTestConfig) => Promise<void>;
}

export function LoadTestModal({ isOpen, initialValues, onClose, onSave }: LoadTestModalProps) {
  const [values, setValues] = useState<LoadTestConfig>(initialValues);
  const [isSaving, setIsSaving] = useState(false);

  useHotKey(
    {
      Escape: e => {
        e.preventDefault();
        onClose();
      }
    },
    undefined,
    isOpen
  );

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
    }
  }, [isOpen, initialValues]);

  const hasChanges =
    values.totalRequests !== initialValues.totalRequests ||
    values.durationSecs !== initialValues.durationSecs ||
    values.concurrent !== initialValues.concurrent;

  const isValid = values.totalRequests > 0 && values.durationSecs > 0 && values.concurrent > 0;

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!isValid || !hasChanges) return;

    setIsSaving(true);
    try {
      await onSave(values);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Load Test Settings</h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.variablesList}>
            <div className={styles.field}>
              <label>Total requests</label>
              <input
                type="number"
                min={1}
                className={styles.variableInput}
                value={values.totalRequests}
                onChange={e => setValues(v => ({ ...v, totalRequests: Number(e.target.value) }))}
              />
              <span className={styles.hint}>Total number of requests to execute</span>
            </div>

            <div className={styles.field}>
              <label>Duration (seconds)</label>
              <input
                type="number"
                min={1}
                className={styles.variableInput}
                value={values.durationSecs}
                onChange={e => setValues(v => ({ ...v, durationSecs: Number(e.target.value) }))}
              />
              <span className={styles.hint}>Maximum duration of the test</span>
            </div>

            <div className={styles.field}>
              <label>Concurrent users</label>
              <input
                type="number"
                min={1}
                className={styles.variableInput}
                value={values.concurrent}
                onChange={e => setValues(v => ({ ...v, concurrent: Number(e.target.value) }))}
              />
              <span className={styles.hint}>Number of parallel requests</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.closeFooterButton} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.saveButton}
            disabled={!hasChanges || !isValid || isSaving}
            onClick={handleSave}
          >
            <Check size={16} />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
