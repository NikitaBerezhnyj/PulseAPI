import { useState, useEffect } from "react";
import { X, Plus, Pencil, Trash2, Check } from "lucide-react";
import styles from "../../styles/components/modals/VariablesModal.module.css";
import { useHotKey } from "../../hooks/useHotKey";

interface VariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  variables: Record<string, string>;
  onAdd: (key: string, value: string) => Promise<void>;
  onUpdate: (key: string, value: string) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
  error: string | null;
  onClearError: () => void;
}

interface VariableItem {
  key: string;
  value: string;
  isEditing: boolean;
}

function VariablesModal({
  isOpen,
  onClose,
  variables,
  onAdd,
  onUpdate,
  onDelete,
  error,
  onClearError
}: VariablesModalProps) {
  const [variablesList, setVariablesList] = useState<VariableItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editValue, setEditValue] = useState("");

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
      const items = Object.entries(variables).map(([key, value]) => ({
        key,
        value,
        isEditing: false
      }));
      setVariablesList(items);
      setIsAdding(false);
    }
  }, [isOpen, variables]);

  if (!isOpen) return null;

  const handleAdd = async () => {
    const key = newKey.trim();
    const value = newValue.trim();

    if (!key) {
      return;
    }

    if (variablesList.some(v => v.key === key)) {
      return;
    }

    await onAdd(key, value);
    setNewKey("");
    setNewValue("");
    setIsAdding(false);
  };

  const handleStartEdit = (item: VariableItem) => {
    setVariablesList(prev =>
      prev.map(v => ({
        ...v,
        isEditing: v.key === item.key
      }))
    );
    setEditValue(item.value);
    onClearError();
  };

  const handleSaveEdit = async (originalKey: string) => {
    const value = editValue.trim();

    await onUpdate(originalKey, value);
    setVariablesList(prev =>
      prev.map(v => (v.key === originalKey ? { ...v, value, isEditing: false } : v))
    );
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setVariablesList(prev => prev.map(v => ({ ...v, isEditing: false })));
    setEditValue("");
    onClearError();
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete variable "${key}"?`)) {
      return;
    }

    await onDelete(key);
    setVariablesList(prev => prev.filter(v => v.key !== key));
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
          <h2>Environment Variables</h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            <span>{error}</span>
            <button onClick={onClearError}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.variablesList}>
            {variablesList.length === 0 && !isAdding && (
              <div className={styles.emptyState}>
                <p>No variables yet</p>
                <span>Add your first environment variable</span>
              </div>
            )}

            {variablesList.map(item => (
              <div key={item.key} className={styles.variableItem}>
                {item.isEditing ? (
                  <>
                    <div className={styles.variableKey}>
                      <span>{item.key}</span>
                    </div>
                    <input
                      type="text"
                      className={styles.variableInput}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder="Value"
                      autoFocus
                    />
                    <div className={styles.actions}>
                      <button
                        className={styles.saveButton}
                        onClick={() => handleSaveEdit(item.key)}
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className={styles.cancelButton}
                        onClick={handleCancelEdit}
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.variableKey}>
                      <span>{item.key}</span>
                    </div>
                    <div className={styles.variableValue}>
                      <span>{item.value || <em className={styles.empty}>empty</em>}</span>
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleStartEdit(item)}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(item.key)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {isAdding && (
              <div className={`${styles.variableItem} ${styles.adding}`}>
                <input
                  type="text"
                  className={styles.variableInput}
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="Variable name"
                  autoFocus
                />
                <input
                  type="text"
                  className={styles.variableInput}
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="Value"
                />
                <div className={styles.actions}>
                  <button className={styles.saveButton} onClick={handleAdd} title="Add">
                    <Check size={16} />
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setIsAdding(false);
                      setNewKey("");
                      setNewValue("");
                      onClearError();
                    }}
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.addButton}
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
          >
            <Plus size={16} />
            <span>Add Variable</span>
          </button>
          <button className={styles.closeFooterButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default VariablesModal;
