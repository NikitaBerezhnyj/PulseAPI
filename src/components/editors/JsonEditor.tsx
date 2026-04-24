import { useCallback, useEffect, useRef, useState } from "react";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { Braces, AlertCircle } from "lucide-react";
import { CodeEditor } from "./CodeEditor";
import styles from "../../styles/components/editors/JsonEditor.module.css";

const JSON_EXTENSIONS = [json()];

const formatJson = (value: string): string | null => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return null;
  }
};

const validateJson = (value: string): string | null => {
  if (!value.trim()) return null;
  try {
    JSON.parse(value);
    return null;
  } catch (e) {
    return (e as SyntaxError).message;
  }
};

// Розширення що забороняє перенос рядка — зручно для onBlur
const blurExtension = (onBlur: () => void) =>
  EditorView.domEventHandlers({
    blur: () => {
      onBlur();
      return false;
    }
  });

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Валідація з debounce
  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setError(validateJson(newValue));
      }, 400);
    },
    [onChange]
  );

  // Format on blur
  const handleBlur = useCallback(() => {
    const formatted = formatJson(value);
    if (formatted !== null && formatted !== value) {
      onChange(formatted);
      setError(null);
    }
  }, [value, onChange]);

  // Явна кнопка Format
  const handleFormat = useCallback(() => {
    const formatted = formatJson(value);
    if (formatted !== null) {
      onChange(formatted);
      setError(null);
    }
  }, [value, onChange]);

  // Скидати помилку якщо value очищеноззовні
  useEffect(() => {
    if (!value.trim()) setError(null);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const extensions = [...JSON_EXTENSIONS, blurExtension(handleBlur)];
  const canFormat = !error && !!value.trim();

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          className={styles.formatButton}
          onClick={handleFormat}
          disabled={!canFormat}
          type="button"
          title="Format JSON"
        >
          <Braces size={14} />
          Format
        </button>
        {error && (
          <div className={styles.error}>
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
        )}
      </div>
      <div className={styles.editorWrapper}>
        <CodeEditor
          value={value}
          onChange={handleChange}
          extensions={extensions}
          placeholder='{"key": "value"}'
          minHeight="100%"
          maxHeight="100%"
        />
      </div>
    </div>
  );
}
