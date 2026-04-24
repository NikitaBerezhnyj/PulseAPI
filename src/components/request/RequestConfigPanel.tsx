import { useMemo } from "react";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { HeadersSection } from "./HeadersSection";
import { BodySection } from "./BodySection";
import styles from "../../styles/components/request/RequestConfigPanel.module.css";
import { IHttpRequest } from "../../types/http";

interface RequestConfigPanelProps {
  request: IHttpRequest;
  variables: string[];
  onChange: (request: IHttpRequest) => void;
}

export function RequestConfigPanel({ request, variables, onChange }: RequestConfigPanelProps) {
  const enabledHeadersCount = useMemo(() => {
    const headers = request.request.headers;

    if (!headers) {
      return 0;
    }

    return Object.keys(headers).filter(key => {
      const value = headers[key];
      return key.trim() !== "" && value !== undefined && value !== null && value !== "";
    }).length;
  }, [request.request.headers]);

  return (
    <div className={styles.panel}>
      <CollapsibleSection title="Headers" badge={enabledHeadersCount} defaultOpen={true}>
        <HeadersSection request={request} variables={variables} onChange={onChange} />
      </CollapsibleSection>

      <CollapsibleSection title="Body" defaultOpen={true}>
        <BodySection request={request} variables={variables} onChange={onChange} />
      </CollapsibleSection>
    </div>
  );
}
