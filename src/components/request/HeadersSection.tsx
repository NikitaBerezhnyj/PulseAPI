import { useState, useEffect } from "react";
import { IHttpRequest } from "../../types/http";
import { KeyValueEditor, KeyValuePair } from "../editors/KeyValueEditor";
import { parseHeaders, serializeHeaders } from "../../utils/requestUtils";

interface HeadersSectionProps {
  request: IHttpRequest;
  variables: string[];
  onChange: (request: IHttpRequest) => void;
}

const getRecommendedHeaders = (method: string): KeyValuePair[] => {
  const recommendations: KeyValuePair[] = [];

  if (["POST", "PUT", "PATCH"].includes(method)) {
    recommendations.push({
      id: `recommended-content-type-${Date.now()}`,
      key: "Content-Type",
      value: "application/json",
      enabled: false
    });
  }

  recommendations.push({
    id: `recommended-accept-${Date.now()}`,
    key: "Accept",
    value: "application/json",
    enabled: false
  });

  return recommendations;
};

const headerExists = (headers: KeyValuePair[], headerName: string): boolean => {
  return headers.some(h => h.key.toLowerCase() === headerName.toLowerCase());
};

export function HeadersSection({ request, variables, onChange }: HeadersSectionProps) {
  const [headers, setHeaders] = useState<KeyValuePair[]>([]);
  const [hasAddedRecommendations, setHasAddedRecommendations] = useState(false);

  useEffect(() => {
    const parsedHeaders = parseHeaders(request.request.headers);

    if (!hasAddedRecommendations && parsedHeaders.length <= 1) {
      const recommended = getRecommendedHeaders(request.request.method);

      const newRecommendations = recommended.filter(rec => !headerExists(parsedHeaders, rec.key));

      if (newRecommendations.length > 0) {
        setHeaders([...parsedHeaders, ...newRecommendations]);
        setHasAddedRecommendations(true);
        return;
      }
    }

    setHeaders(parsedHeaders);
    setHasAddedRecommendations(true);
  }, [request, hasAddedRecommendations]);

  const handleHeadersChange = (updatedHeaders: KeyValuePair[]) => {
    setHeaders(updatedHeaders);

    onChange({
      ...request,
      request: {
        ...request.request,
        headers: serializeHeaders(updatedHeaders)
      }
    });
  };

  return (
    <KeyValueEditor
      pairs={headers}
      onChange={handleHeadersChange}
      variables={variables}
      placeholder={{ key: "Header", value: "Value" }}
    />
  );
}
