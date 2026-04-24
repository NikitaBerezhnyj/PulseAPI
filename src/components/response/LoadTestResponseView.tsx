import { ILoadTestResult } from "../../types/load-test";
import styles from "../../styles/components/response/LoadTestResponseView.module.css";

interface Props {
  data: ILoadTestResult;
  progress?: number;
  running?: boolean;
}

export function LoadTestResponseView({ data, progress = 0, running = false }: Props) {
  if (!data) {
    return <div className={styles.empty}>Loading test results...</div>;
  }

  return (
    <>
      {running && (
        <div className={styles.progressBar}>
          <p>Progress: {(progress * 100).toFixed(0)}%</p>
          <progress value={progress} max={1} />
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.loadTestStats}>
          <h4>Requests</h4>
          <div className={styles.statGroup}>
            <Stat label="Total" value={data.totalRequests} />
            <Stat label="Successful" value={data.successful} className={styles.success} />
            <Stat label="Failed" value={data.failed} className={styles.failed} />
          </div>

          <h4>Performance</h4>
          <div className={styles.statGroup}>
            <Stat label="Avg Response" value={`${data.avgResponseTimeMs.toFixed(2)} ms`} />
            <Stat label="Min Response" value={`${data.minResponseTimeMs} ms`} />
            <Stat label="Max Response" value={`${data.maxResponseTimeMs} ms`} />
            <Stat label="RPS" value={data.requestsPerSecond.toFixed(2)} />
          </div>

          {!!Object.keys(data.statusCodes).length && (
            <>
              <h4>Status Codes</h4>
              <div className={styles.statGroup}>
                {Object.entries(data.statusCodes).map(([code, count]) => (
                  <Stat key={code} label={code} value={count} />
                ))}
              </div>
            </>
          )}

          {!!data.errors.length && (
            <>
              <h4>Errors</h4>
              <div className={styles.statGroup}>
                <pre className={styles.errorList}>{data.errors.join("\n")}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  className
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={styles.stat}>
      <span>{label}:</span>
      <span className={className}>{value}</span>
    </div>
  );
}
