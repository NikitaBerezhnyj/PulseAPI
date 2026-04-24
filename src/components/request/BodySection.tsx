import { useState, useEffect } from "react";
import styles from "../../styles/components/request/BodySection.module.css";
import { IHttpRequest } from "../../types/http";
import { KeyValueEditor, KeyValuePair } from "../editors/KeyValueEditor";
import { parseUrlParams, updateUrlWithParams } from "../../utils/requestUtils";
import { JsonEditor } from "../editors/JsonEditor";
import { XmlEditor } from "../editors/XmlEditor";

interface BodySectionProps {
  request: IHttpRequest;
  variables: string[];
  onChange: (request: IHttpRequest) => void;
}

type BodyType = "params" | "json" | "xml" | "raw" | "files";

interface BodyContents {
  json: string;
  xml: string;
  raw: string;
}

export function BodySection({ request, variables, onChange }: BodySectionProps) {
  const [bodyType, setBodyType] = useState<BodyType>("json");
  const [params, setParams] = useState<KeyValuePair[]>([]);

  const [bodyContents, setBodyContents] = useState<BodyContents>({
    json: "",
    xml: "",
    raw: ""
  });

  const detectBodyType = (body: string): BodyType => {
    if (!body || body.trim() === "") {
      return "params";
    }

    const trimmed = body.trim();

    if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
      return "xml";
    }

    try {
      JSON.parse(body);
      return "json";
    } catch {
      return "raw";
    }
  };

  useEffect(() => {
    setParams(parseUrlParams(request.request.url));

    const body = request.request.body || "";
    const detectedType = detectBodyType(body);

    setBodyType(detectedType);

    setBodyContents({
      json: detectedType === "json" ? body : "",
      xml: detectedType === "xml" ? body : "",
      raw: detectedType === "raw" ? body : ""
    });
  }, [request.id]);

  const handleParamsChange = (updatedParams: KeyValuePair[]) => {
    setParams(updatedParams);
    const newUrl = updateUrlWithParams(request.request.url, updatedParams);

    onChange({
      ...request,
      request: {
        ...request.request,
        url: newUrl,
        body: ""
      }
    });
  };

  const handleBodyContentChange = (type: "json" | "xml" | "raw", content: string) => {
    setBodyContents(prev => ({
      ...prev,
      [type]: content
    }));

    onChange({
      ...request,
      request: {
        ...request.request,
        body: content
      }
    });
  };

  const handleBodyTypeChange = (newType: BodyType) => {
    setBodyType(newType);

    let newBody = "";

    switch (newType) {
      case "json":
        newBody = bodyContents.json;
        break;
      case "xml":
        newBody = bodyContents.xml;
        break;
      case "raw":
        newBody = bodyContents.raw;
        break;
      case "params":
        break;
    }

    onChange({
      ...request,
      request: {
        ...request.request,
        body: newBody
      }
    });
  };

  const bodyTypes: { id: BodyType; label: string }[] = [
    { id: "params", label: "Params" },
    { id: "json", label: "JSON" },
    { id: "xml", label: "XML" },
    { id: "raw", label: "Raw" },
    { id: "files", label: "Files" }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.typeSelector}>
        {bodyTypes.map(type => (
          <button
            key={type.id}
            onClick={() => handleBodyTypeChange(type.id)}
            className={`${styles.typeButton} ${bodyType === type.id ? styles.active : ""}`}
            type="button"
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className={styles.editorArea}>
        {bodyType === "params" && (
          <KeyValueEditor
            pairs={params}
            onChange={handleParamsChange}
            variables={variables}
            placeholder={{ key: "Param", value: "Value" }}
          />
        )}

        {bodyType === "json" && (
          <JsonEditor
            value={bodyContents.json}
            onChange={value => handleBodyContentChange("json", value)}
          />
        )}

        {bodyType === "xml" && (
          <XmlEditor
            value={bodyContents.xml}
            onChange={value => handleBodyContentChange("xml", value)}
          />
        )}

        {bodyType === "raw" && (
          <textarea
            value={bodyContents.raw}
            onChange={e => handleBodyContentChange("raw", e.target.value)}
            placeholder="Raw text content"
            className={styles.textarea}
            spellCheck={false}
          />
        )}

        {bodyType === "files" && (
          <p style={{ color: "var(--color-text-muted)" }}>
            Files editor (TODO: implement file upload)
          </p>
        )}
      </div>
    </div>
  );
}
