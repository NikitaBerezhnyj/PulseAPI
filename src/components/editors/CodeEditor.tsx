import CodeMirror, { Extension } from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { createTheme } from "@uiw/codemirror-themes";
import styles from "../../styles/components/editors/CodeEditor.module.css";

// Тема побудована на CSS змінних проєкту
const appTheme = createTheme({
  theme: "dark",
  settings: {
    background: "var(--color-surface)",
    foreground: "var(--color-text)",
    caret: "var(--color-accent)",
    selection: "rgba(79, 140, 255, 0.2)",
    selectionMatch: "rgba(79, 140, 255, 0.12)",
    lineHighlight: "rgba(255,255,255,0.03)",
    gutterBackground: "var(--color-surface)",
    gutterForeground: "var(--color-text-disabled)",
    gutterBorder: "transparent",
    gutterActiveForeground: "var(--color-text-muted)"
  },
  styles: [
    { tag: t.comment, color: "#5f6678", fontStyle: "italic" },
    { tag: t.string, color: "#3fb950" },
    { tag: t.number, color: "#d29922" },
    { tag: t.bool, color: "#4f8cff" },
    { tag: t.null, color: "#f85149" },
    { tag: t.propertyName, color: "#9aa1b2" },
    { tag: t.keyword, color: "#4f8cff" },
    { tag: t.punctuation, color: "#5f6678" },
    { tag: t.angleBracket, color: "#5f6678" },
    { tag: t.tagName, color: "#4f8cff" },
    { tag: t.attributeName, color: "#9aa1b2" },
    { tag: t.attributeValue, color: "#3fb950" }
  ]
});

// Кастомне розширення для шрифту і базових стилів
const fontExtension = EditorView.theme({
  "&": {
    fontSize: "var(--font-size-md)",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    height: "100%"
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
    lineHeight: "1.6"
  },
  ".cm-content": {
    padding: "var(--space-md) 0",
    caretColor: "var(--color-accent)"
  },
  ".cm-line": {
    padding: "0 var(--space-md)"
  },
  ".cm-gutters": {
    minWidth: "40px",
    padding: "0 var(--space-sm)"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent"
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-accent)"
  },
  // Прибираємо дефолтний border від CodeMirror
  "&.cm-focused": {
    outline: "none"
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(79, 140, 255, 0.2) !important"
  }
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  extensions?: Extension[];
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}

export function CodeEditor({
  value,
  onChange,
  extensions = [],
  readOnly = false,
  placeholder,
  minHeight = "120px",
  maxHeight = "100%"
}: CodeEditorProps) {
  return (
    <div className={styles.wrapper} style={{ minHeight, maxHeight }}>
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={appTheme}
        readOnly={readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          autocompletion: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBrackets: true,
          searchKeymap: true
        }}
        extensions={[fontExtension, ...extensions]}
        style={{ height: "100%" }}
      />
    </div>
  );
}
