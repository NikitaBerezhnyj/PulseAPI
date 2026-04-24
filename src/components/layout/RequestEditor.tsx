import { useEffect, useState } from "react";
import styles from "../../styles/components/layout/RequestEditor.module.css";
import { DropdownButton } from "../common/DropdownButton";
import { HttpMethod, IHttpRequest } from "../../types/http";
import { VariableInput } from "../common/VariableInput";
import { getRandomUrl } from "../../utils/randomUrl";
import { RequestConfigPanel } from "../request/RequestConfigPanel";
import { useDebouncedEffect } from "../../hooks/useDebouncedEffect";

interface RequestEditorProps {
  request: IHttpRequest | null;
  variables: string[] | null;
  onChange: (request: IHttpRequest) => void;
  onSend: (request: IHttpRequest) => void;
  onTest: (request: IHttpRequest) => void;
}

function RequestEditor({ request, variables, onChange, onSend, onTest }: RequestEditorProps) {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [action, setAction] = useState("send");

  const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

  useEffect(() => {
    if (!request) return;

    setUrl(request.request.url || "");
    setMethod(request.request.method || "GET");
  }, [request]);

  useDebouncedEffect(
    () => {
      if (!request) return;

      onChange({
        ...request,
        request: {
          ...request.request,
          url
        }
      });
    },
    [url],
    400
  );

  const isHttpMethod = (value: string): value is HttpMethod => {
    return ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(value);
  };

  const handleOnMethodChanged = (newMethod: HttpMethod) => {
    setMethod(newMethod);

    if (!request) return;

    onChange({
      ...request,
      request: {
        ...request.request,
        method: newMethod
      }
    });
  };

  const handleOnActionButtonPress = () => {
    if (!request) return;

    if (action === "send") {
      onSend(request);
    } else {
      onTest(request);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <select
          name="method"
          id="method"
          value={method}
          disabled={!request}
          onChange={e => {
            const value = e.target.value;
            if (isHttpMethod(value)) {
              handleOnMethodChanged(value);
            }
          }}
        >
          {HTTP_METHODS.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <VariableInput
          value={url}
          onChange={setUrl}
          variables={variables ?? []}
          placeholder={getRandomUrl()}
          disabled={!request}
        />
        <DropdownButton
          disabled={!request}
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
        {!request ? (
          <div className={styles.emptyState}>
            <h2>No active request selected</h2>
            <p>Please select a request from the list or create a new one to start editing.</p>
          </div>
        ) : (
          <RequestConfigPanel request={request} variables={variables ?? []} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

export default RequestEditor;
