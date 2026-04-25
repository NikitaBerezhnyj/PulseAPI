import { useMemo } from "react";
import { useResizable } from "../../hooks/useResizable";
import { ResponseData } from "../../types/response";
import styles from "../../styles/components/layout/ResponseViewer.module.css";
import { HttpResponseView } from "../response/HttpResponseView";
import { LoadTestResponseView } from "../response/LoadTestResponseView";

interface ResponseViewerProps {
  response: ResponseData;
}

export function ResponseViewer({ response }: ResponseViewerProps) {
  const {
    size: height,
    isResizing,
    handleMouseDown
  } = useResizable({
    direction: "vertical",
    minSize: 120,
    maxSize: 600,
    defaultSize: 250
  });

  const parsedBody = useMemo(() => {
    if (!response || response.type !== "http") return null;
    try {
      return JSON.parse(response.data.body);
    } catch {
      return response.data.body;
    }
  }, [response]);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) {
      return `${Math.round(ms)} ms`;
    }

    if (ms < 60_000) {
      return `${(ms / 1000).toFixed(2)} s`;
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;

    return `${minutes} m ${restSeconds} s`;
  };

  if (!response) {
    return (
      <div className={styles.panel} style={{ height }}>
        <div
          className={`${styles.resizer} ${isResizing ? styles.resizing : ""}`}
          onMouseDown={handleMouseDown}
        />
        <div className={styles.content}>
          <div className={styles.header}>
            <h3>Response</h3>
          </div>
          <div className={styles.body}>
            <p>No response yet. Please send a request.</p>
          </div>
        </div>
      </div>
    );
  }

  const statusClass =
    response.type === "http" ? (styles[`status${response.data.status}`] ?? "") : "";

  return (
    <div className={styles.panel} style={{ height }}>
      <div
        className={`${styles.resizer} ${isResizing ? styles.resizing : ""}`}
        onMouseDown={handleMouseDown}
      />

      <div className={styles.content}>
        <div className={styles.header}>
          <h3>{response.type === "http" ? "Response" : "Load Test Results"}</h3>

          <div className={styles.meta}>
            {response.type === "http" && (
              <>
                <span className={`${styles.status} ${statusClass}`}>{response.data.status}</span>

                {response.data.time_ms && (
                  <span className={styles.time}>{response.data.time_ms} ms</span>
                )}

                {response.data.headers["content-type"] && (
                  <span className={styles.type}>{response.data.headers["content-type"]}</span>
                )}
              </>
            )}

            {response.type === "load-test" && (
              <>
                <span className={styles.status}>
                  {response.running ? "Running..." : "Completed"}
                </span>
                <span
                  className={styles.time}
                  title={`${response.data.totalDurationMs.toFixed(2)} ms`}
                >
                  {formatDuration(response.data.totalDurationMs)}
                </span>
              </>
            )}
          </div>
        </div>

        {response.type === "http" ? (
          <HttpResponseView data={response.data} parsedBody={parsedBody} />
        ) : (
          <LoadTestResponseView
            data={response.data}
            progress={response.progress}
            running={response.running}
          />
        )}
      </div>
    </div>
  );
}
