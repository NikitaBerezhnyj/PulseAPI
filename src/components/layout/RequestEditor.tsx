import { useEffect, useRef, useState, useCallback } from "react";
import styles from "../../styles/components/layout/RequestEditor.module.css";
import { DropdownButton } from "../common/DropdownButton";
import { HttpMethod, IHttpRequest } from "../../types/http";
import { VariableInput } from "../common/VariableInput";
import { getRandomUrl } from "../../utils/randomUrl";
import { RequestConfigPanel } from "../request/RequestConfigPanel";

interface RequestEditorProps {
  request: IHttpRequest | null;
  variables: string[] | null;
  onChange: (request: IHttpRequest) => void;
  onSend: (request: IHttpRequest) => void;
  onTest: (request: IHttpRequest) => void;
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const isHttpMethod = (value: string): value is HttpMethod =>
  HTTP_METHODS.includes(value as HttpMethod);

function RequestEditor({ request, variables, onChange, onSend, onTest }: RequestEditorProps) {
  const [draft, setDraft] = useState<IHttpRequest | null>(null);
  const [action, setAction] = useState("send");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraft(request);
  }, [request?.id]);

  const scheduleSave = useCallback((updated: IHttpRequest) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChangeRef.current(updated);
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleDraftChange = useCallback(
    (updated: IHttpRequest) => {
      setDraft(updated);
      scheduleSave(updated);
    },
    [scheduleSave]
  );

  const handleMethodChange = useCallback(
    (newMethod: HttpMethod) => {
      if (!draft) return;
      handleDraftChange({
        ...draft,
        request: { ...draft.request, method: newMethod }
      });
    },
    [draft, handleDraftChange]
  );

  const handleUrlChange = useCallback(
    (newUrl: string) => {
      if (!draft) return;
      handleDraftChange({
        ...draft,
        request: { ...draft.request, url: newUrl }
      });
    },
    [draft, handleDraftChange]
  );

  const handleOnActionButtonPress = () => {
    if (!draft) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChangeRef.current(draft);
    if (action === "send") {
      onSend(draft);
    } else {
      onTest(draft);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <select
          name="method"
          id="method"
          value={draft?.request.method ?? "GET"}
          disabled={!draft}
          onChange={e => {
            const value = e.target.value;
            if (isHttpMethod(value)) handleMethodChange(value);
          }}
        >
          {HTTP_METHODS.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <VariableInput
          value={draft?.request.url ?? ""}
          onChange={handleUrlChange}
          variables={variables ?? []}
          placeholder={getRandomUrl()}
          disabled={!draft}
        />
        <DropdownButton
          disabled={!draft}
          label={action === "send" ? "Send" : "Test"}
          options={[
            { label: "Send", value: "send" },
            { label: "Test", value: "test" }
          ]}
          onChange={value => setAction(value)}
          onClick={handleOnActionButtonPress}
        />
      </div>
      <div className={styles.editor}>
        {!draft ? (
          <div className={styles.emptyState}>
            <h2>No active request selected</h2>
            <p>Please select a request from the list or create a new one to start editing.</p>
          </div>
        ) : (
          <RequestConfigPanel
            request={draft}
            variables={variables ?? []}
            onChange={handleDraftChange}
          />
        )}
      </div>
    </div>
  );
}

export default RequestEditor;
