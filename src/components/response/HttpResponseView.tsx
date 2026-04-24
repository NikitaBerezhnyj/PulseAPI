import { IHttpResponse } from "../../types/http";
import styles from "../../styles/components/response/HttpResponseView.module.css";

interface Props {
  data: IHttpResponse;
  parsedBody: unknown;
}

export function HttpResponseView({ data, parsedBody }: Props) {
  return (
    <>
      <div className={styles.body}>
        <h4>Headers:</h4>
        <pre className={styles.pre}>
          {Object.entries(data.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")}
        </pre>

        <h4>Body:</h4>
        <pre className={styles.pre}>
          {typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody, null, 2)}
        </pre>
      </div>
    </>
  );
}
