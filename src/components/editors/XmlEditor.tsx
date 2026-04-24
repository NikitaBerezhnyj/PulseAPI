import { useCallback, useEffect, useRef, useState } from "react";
import { xml } from "@codemirror/lang-xml";
import { EditorView } from "@codemirror/view";
import { Code2, AlertCircle } from "lucide-react";
import { CodeEditor } from "./CodeEditor";
import styles from "../../styles/components/editors/XmlEditor.module.css";

const XML_EXTENSIONS = [xml()];

const validateXml = (value: string): string | null => {
  if (!value.trim()) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    // DOMParser повертає опис помилки всередині parsererror
    const message = errorNode.textContent ?? "Invalid XML";
    // Прибираємо зайве — браузер часто додає довгий префікс
    const firstLine = message.split("\n").find(l => l.trim()) ?? message;
    return firstLine.trim();
  }
  return null;
};

const formatXml = (value: string): string | null => {
  const error = validateXml(value);
  if (error) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "application/xml");

  const serializeNode = (node: Node, depth: number): string => {
    const indent = "  ".repeat(depth);

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? "";
      return text ? `${indent}${text}` : "";
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      return `${indent}<!--${node.textContent}-->`;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as Element;
    const tagName = el.tagName;

    // Атрибути
    const attrs = Array.from(el.attributes)
      .map(a => `${a.name}="${a.value}"`)
      .join(" ");
    const openTag = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;

    const children = Array.from(el.childNodes)
      .map(child => serializeNode(child, depth + 1))
      .filter(Boolean);

    if (children.length === 0) {
      // Self-closing якщо немає дітей
      return attrs ? `${indent}<${tagName} ${attrs} />` : `${indent}<${tagName} />`;
    }

    // Якщо єдиний дочірній — текстовий вузол, залишаємо в одному рядку
    if (children.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
      return `${indent}${openTag}${el.childNodes[0].textContent?.trim()}</${tagName}>`;
    }

    return `${indent}${openTag}\n${children.join("\n")}\n${indent}</${tagName}>`;
  };

  const result = serializeNode(doc.documentElement, 0);
  return result || null;
};

const blurExtension = (onBlur: () => void) =>
  EditorView.domEventHandlers({
    blur: () => {
      onBlur();
      return false;
    }
  });

interface XmlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function XmlEditor({ value, onChange }: XmlEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setError(validateXml(newValue));
      }, 400);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    const formatted = formatXml(value);
    if (formatted !== null && formatted !== value) {
      onChange(formatted);
      setError(null);
    }
  }, [value, onChange]);

  const handleFormat = useCallback(() => {
    const formatted = formatXml(value);
    if (formatted !== null) {
      onChange(formatted);
      setError(null);
    }
  }, [value, onChange]);

  useEffect(() => {
    if (!value.trim()) setError(null);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const extensions = [...XML_EXTENSIONS, blurExtension(handleBlur)];
  const canFormat = !error && !!value.trim();

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          className={styles.formatButton}
          onClick={handleFormat}
          disabled={!canFormat}
          type="button"
          title="Format XML"
        >
          <Code2 size={14} />
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
          placeholder="<root>...</root>"
          minHeight="100%"
          maxHeight="100%"
        />
      </div>
    </div>
  );
}
