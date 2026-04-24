import { useCallback } from "react";
import { CodeEditor } from "./CodeEditor";
import styles from "../../styles/components/editors/RawEditor.module.css";

interface RawEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RawEditor({ value, onChange }: RawEditorProps) {
  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className={styles.container}>
      <div className={styles.editorWrapper}>
        <CodeEditor
          value={value}
          onChange={handleChange}
          extensions={[]}
          placeholder="Raw text content"
          minHeight="100%"
          maxHeight="100%"
        />
      </div>
    </div>
  );
}
