import { KeyValuePair } from "../components/editors/KeyValueEditor";

export function parseHeaders(headers?: Record<string, string>): KeyValuePair[] {
  if (!headers) {
    return [];
  }

  return Object.entries(headers).map(([key, value], index) => ({
    id: `header-${key}-${index}-${Date.now()}`,
    key,
    value,
    enabled: true
  }));
}

export function serializeHeaders(pairs: KeyValuePair[]): Record<string, string> {
  return pairs
    .filter(h => h.enabled && h.key.trim() !== "")
    .reduce<Record<string, string>>((acc, h) => {
      acc[h.key.trim()] = h.value;
      return acc;
    }, {});
}

export function parseUrlParams(url: string): KeyValuePair[] {
  try {
    const urlObj = new URL(url);
    const params: KeyValuePair[] = [];

    urlObj.searchParams.forEach((value, key) => {
      params.push({
        id: `param-${key}-${params.length}-${Date.now()}`,
        key,
        value,
        enabled: true
      });
    });

    return params;
  } catch {
    return [];
  }
}

export function serializeUrlParams(pairs: KeyValuePair[]): string {
  return pairs
    .filter(p => p.enabled && p.key.trim() !== "")
    .map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
    .join("&");
}

export function updateUrlWithParams(url: string, params: KeyValuePair[]): string {
  try {
    const urlObj = new URL(url);
    const queryString = serializeUrlParams(params);

    urlObj.search = "";

    if (queryString) {
      urlObj.search = "?" + queryString;
    }

    return urlObj.toString();
  } catch {
    const queryString = serializeUrlParams(params);
    const separator = url.includes("?") ? "&" : "?";

    const baseUrl = url.split("?")[0];

    return queryString ? `${baseUrl}${separator}${queryString}` : baseUrl;
  }
}

export function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.search = "";
    return urlObj.toString();
  } catch {
    return url.split("?")[0];
  }
}
