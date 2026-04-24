export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS" | "HEAD";

export interface IHttpRequest {
  id: string;
  name: string;
  request: {
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    timeout: {
      secs: number;
      nanos: number;
    };
    follow_redirects: boolean;
  };
}

export interface IHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
}
