import { useState, useRef, useEffect } from "react";
import { useHotKey } from "../../hooks/useHotKey";
import styles from "../../styles/components/common/VariableInput.module.css";

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  variables: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function VariableInput({
  value,
  onChange,
  variables,
  placeholder,
  disabled
}: VariableInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredVariables, setFilteredVariables] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [caretPosition, setCaretPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  const updateCurrentWord = (text: string, cursorPos: number) => {
    const left = text.slice(0, cursorPos);
    // eslint-disable-next-line sonarjs/slow-regex
    const match = left.match(/\w+$/u);
    const word = match ? match[0] : "";
    setCurrentWord(word);

    if (word.length > 0) {
      const matches = variables.filter(v => v.toLowerCase().startsWith(word.toLowerCase()));
      setFilteredVariables(matches);
      setShowSuggestions(matches.length > 0);
      setSelectedIndex(-1);
    } else if (inputRef.current === document.activeElement) {
      setFilteredVariables(variables);
      setShowSuggestions(variables.length > 0);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const text = e.target.value;
    const cursorPos = e.target.selectionStart ?? text.length;
    setCaretPosition(cursorPos);
    onChange(text);
    updateCurrentWord(text, cursorPos);
  };

  const handleFocus = () => {
    if (disabled) return;

    if (!value) {
      setFilteredVariables(variables);
      setShowSuggestions(variables.length > 0);
      setSelectedIndex(-1);
    }
  };

  const handleSelectVariable = (variable: string) => {
    if (disabled) return;

    if (!inputRef.current) return;

    const text = value;
    const start = caretPosition - currentWord.length;
    const end = caretPosition;
    const newText = text.slice(0, start) + `{{${variable}}}` + text.slice(end);

    onChange(newText);

    const newPos = start + variable.length + 4;
    setCaretPosition(newPos);
    setShowSuggestions(false);
    setSelectedIndex(-1);

    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  useHotKey(
    {
      " ": e => {
        if (disabled) return;

        if (e.ctrlKey) {
          e.preventDefault();
          if (!showSuggestions) {
            setFilteredVariables(variables);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }
        }
      },
      ArrowDown: e => {
        if (disabled || !showSuggestions) return;
        e.preventDefault();

        setSelectedIndex(prev => {
          if (prev === -1) {
            return 0;
          }

          return Math.min(prev + 1, filteredVariables.length - 1);
        });
      },
      ArrowUp: e => {
        if (disabled || !showSuggestions) return;
        e.preventDefault();

        setSelectedIndex(prev => {
          if (prev <= 0) {
            inputRef.current?.focus();
            return -1;
          }

          return prev - 1;
        });
      },
      Enter: e => {
        if (disabled) return;

        if (showSuggestions && selectedIndex >= 0 && selectedIndex < filteredVariables.length) {
          e.preventDefault();
          handleSelectVariable(filteredVariables[selectedIndex]);
        }
      },
      Escape: e => {
        if (disabled) return;

        if (showSuggestions) {
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedIndex(-1);
          inputRef.current?.focus();
        }
      }
    },
    containerRef,
    true
  );

  return (
    <div ref={containerRef} className={styles.container}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onChange={disabled ? undefined : handleChange}
        onFocus={disabled ? undefined : handleFocus}
        className={styles.input}
      />
      {!disabled && showSuggestions && (
        <ul ref={suggestionsRef} className={styles.suggestions}>
          {filteredVariables.map((v, index) => (
            <li
              key={v}
              onMouseDown={() => handleSelectVariable(v)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`${styles.suggestionItem} ${index === selectedIndex ? styles.selected : ""}`}
            >
              {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
