import { IHttpRequest } from "./http";

export interface IHttpGroup {
  id: string;
  name: string | null;
  requests: IHttpRequest[];
}

export interface IFileStructure {
  variables: Record<string, string>;
  groups: IHttpGroup[];
}
