import { Plus, X } from "lucide-react";
import { VariableInput } from "../common/VariableInput";
import styles from "../../styles/components/editors/KeyValueEditor.module.css";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  variables: string[];
  placeholder?: {
    key: string;
    value: string;
  };
}

export function KeyValueEditor({
  pairs,
  onChange,
  variables,
  placeholder = { key: "Key", value: "Value" }
}: KeyValueEditorProps) {
  const addPair = () => {
    const newPair: KeyValuePair = {
      id: `${Date.now()}-${Math.random()}`,
      key: "",
      value: "",
      enabled: true
    };
    onChange([...pairs, newPair]);
  };

  const updatePair = (id: string, field: keyof KeyValuePair, value: string | boolean) => {
    onChange(pairs.map(pair => (pair.id === id ? { ...pair, [field]: value } : pair)));
  };

  const removePair = (id: string) => {
    onChange(pairs.filter(pair => pair.id !== id));
  };

  // Auto-add empty row if all rows are filled
  const hasEmptyRow = pairs.some(p => p.key === "" && p.value === "");
  if (pairs.length === 0 || !hasEmptyRow) {
    // We'll add it on render, but not in the render itself
    // This will be handled by the parent or we add a button
  }

  return (
    <div className={styles.editor}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerCell} style={{ width: "40px" }}></span>
        <span className={styles.headerCell} style={{ flex: 1 }}>
          {placeholder.key}
        </span>
        <span className={styles.headerCell} style={{ flex: 1 }}>
          {placeholder.value}
        </span>
        <span className={styles.headerCell} style={{ width: "40px" }}></span>
      </div>

      {/* Rows */}
      <div className={styles.rows}>
        {pairs.map(pair => (
          <div key={pair.id} className={styles.row}>
            <input
              type="checkbox"
              checked={pair.enabled}
              onChange={e => updatePair(pair.id, "enabled", e.target.checked)}
              className={styles.checkbox}
            />
            <input
              type="text"
              value={pair.key}
              onChange={e => updatePair(pair.id, "key", e.target.value)}
              placeholder={placeholder.key}
              className={styles.keyInput}
            />
            <VariableInput
              value={pair.value}
              onChange={value => updatePair(pair.id, "value", value)}
              variables={variables}
              placeholder={placeholder.value}
            />
            <button
              onClick={() => removePair(pair.id)}
              className={styles.removeButton}
              title="Remove"
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button onClick={addPair} className={styles.addButton} type="button">
        <Plus size={16} />
        Add {placeholder.key}
      </button>
    </div>
  );
}
