import { useState, useEffect } from "react";
import { IHttpRequest } from "../../types/http";
import { KeyValueEditor, KeyValuePair } from "../editors/KeyValueEditor";
import { parseUrlParams, updateUrlWithParams } from "../../utils/requestUtils";

interface ParamsSectionProps {
  request: IHttpRequest;
  variables: string[];
  onChange: (request: IHttpRequest) => void;
}

export function ParamsSection({ request, variables, onChange }: ParamsSectionProps) {
  const [params, setParams] = useState<KeyValuePair[]>([]);

  useEffect(() => {
    setParams(parseUrlParams(request.request.url));
  }, [request.id]);

  const handleParamsChange = (updatedParams: KeyValuePair[]) => {
    setParams(updatedParams);
    const newUrl = updateUrlWithParams(request.request.url, updatedParams);
    onChange({
      ...request,
      request: {
        ...request.request,
        url: newUrl
      }
    });
  };

  return (
    <KeyValueEditor
      pairs={params}
      onChange={handleParamsChange}
      variables={variables}
      placeholder={{ key: "Param", value: "Value" }}
    />
  );
}
