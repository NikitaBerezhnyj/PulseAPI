import { useMemo } from "react";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { HeadersSection } from "./HeadersSection";
import { BodySection } from "./BodySection";
import { ParamsSection } from "./ParamsSection";
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
    if (!headers) return 0;
    return Object.keys(headers).filter(key => {
      const value = headers[key];
      return key.trim() !== "" && value !== undefined && value !== null && value !== "";
    }).length;
  }, [request.request.headers]);

  const paramsCount = useMemo(() => {
    try {
      const url = request.request.url;
      const questionMark = url.indexOf("?");
      if (questionMark === -1) return 0;
      const queryString = url.slice(questionMark + 1);
      if (!queryString) return 0;
      return queryString.split("&").filter(pair => {
        const [key] = pair.split("=");
        return key.trim() !== "";
      }).length;
    } catch {
      return 0;
    }
  }, [request.request.url]);

  return (
    <div className={styles.panel}>
      <CollapsibleSection title="Params" badge={paramsCount} defaultOpen={true}>
        <ParamsSection request={request} variables={variables} onChange={onChange} />
      </CollapsibleSection>
      <CollapsibleSection title="Headers" badge={enabledHeadersCount} defaultOpen={true}>
        <HeadersSection request={request} variables={variables} onChange={onChange} />
      </CollapsibleSection>
      <CollapsibleSection title="Body" defaultOpen={true} grow={true}>
        <BodySection request={request} variables={variables} onChange={onChange} />
      </CollapsibleSection>
    </div>
  );
}
