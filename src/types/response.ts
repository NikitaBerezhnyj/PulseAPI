import { IHttpResponse } from "./http";
import { ILoadTestResult } from "./load-test";

export type ResponseData =
  | { type: "http"; data: IHttpResponse }
  | { type: "load-test"; data: ILoadTestResult; progress?: number; running?: boolean }
  | null;
