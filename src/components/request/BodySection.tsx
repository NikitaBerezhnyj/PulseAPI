import { useState, useEffect } from "react";
import styles from "../../styles/components/request/BodySection.module.css";
import { IHttpRequest } from "../../types/http";
import { JsonEditor } from "../editors/JsonEditor";
import { XmlEditor } from "../editors/XmlEditor";
import { RawEditor } from "../editors/RawEditor";

interface BodySectionProps {
  request: IHttpRequest;
  variables: string[];
  onChange: (request: IHttpRequest) => void;
}

type BodyType = "json" | "xml" | "raw";

interface BodyContents {
  json: string;
  xml: string;
  raw: string;
}

export function BodySection({ request, onChange }: BodySectionProps) {
  const [bodyType, setBodyType] = useState<BodyType>("json");

  const [bodyContents, setBodyContents] = useState<BodyContents>({
    json: "",
    xml: "",
    raw: ""
  });

  const detectBodyType = (body: string): BodyType => {
    if (!body || body.trim() === "") {
      return "json";
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
    const body = request.request.body || "";
    const detectedType = detectBodyType(body);

    setBodyType(detectedType);

    setBodyContents({
      json: detectedType === "json" ? body : "",
      xml: detectedType === "xml" ? body : "",
      raw: detectedType === "raw" ? body : ""
    });
  }, [request.id]);

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
    { id: "json", label: "JSON" },
    { id: "xml", label: "XML" },
    { id: "raw", label: "Raw" }
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
          <RawEditor
            value={bodyContents.raw}
            onChange={value => handleBodyContentChange("raw", value)}
          />
        )}
      </div>
    </div>
  );
}
