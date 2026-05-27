/** Normalize URL path segments for mock matching */
export function normalizePathname(input: string): string {
  if (!input || input === "/") return "/";
  let p = input.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/+/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

export function joinBaseAndPath(baseUrl: string, endpointPath: string): string {
  let pathname = "/";
  try {
    const u = new URL(baseUrl);
    pathname = u.pathname || "/";
  } catch {
    pathname = normalizePathname(baseUrl);
  }
  const ep = normalizePathname(endpointPath);
  if (pathname === "/") return ep;
  if (ep === "/") return normalizePathname(pathname);
  return normalizePathname(`${pathname}${ep}`);
}

/** Full pathname used for mock matching: base pathname + optional version prefix + endpoint path. */
export function apiMatchPath(baseUrl: string, pathVersionPrefix: string | undefined, endpointPath: string): string {
  let pathname = "/";
  try {
    const u = new URL(baseUrl);
    pathname = u.pathname || "/";
  } catch {
    pathname = normalizePathname(baseUrl);
  }
  const base = pathname === "/" ? "" : pathname;
  const vpRaw = pathVersionPrefix?.trim();
  const vp = vpRaw ? normalizePathname(vpRaw) : "";
  const ep = normalizePathname(endpointPath);
  if (!vp || vp === "/") {
    return joinBaseAndPath(baseUrl, endpointPath);
  }
  const mid = `${base}${vp}`;
  if (ep === "/") return normalizePathname(mid) || "/";
  return normalizePathname(`${mid}${ep}`);
}

export function displayApiPath(a: { baseUrl: string; path: string; pathVersionPrefix?: string }): string {
  return apiMatchPath(a.baseUrl, a.pathVersionPrefix, a.path);
}

/** Build a query string from API "query params" rows (documentation / example values). Omits rows with empty keys. */
export function queryStringFromKeyValuePairs(pairs: { key: string; value: string }[]): string {
  const parts = pairs
    .filter((p) => p.key.trim())
    .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent((p.value ?? "").trim())}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/** Match path plus optional example query string (for Playground / Try links so matchWhen.query can match). */
export function displayApiPathWithQuery(
  a: { baseUrl: string; path: string; pathVersionPrefix?: string },
  queryParams: { key: string; value: string }[],
): string {
  const path = displayApiPath(a);
  return `${path}${queryStringFromKeyValuePairs(queryParams)}`;
}

/**
 * Match a request pathname against a template that may contain `:param` or `{param}` segments.
 * Returns a map of extracted param values on match, or null on mismatch.
 *
 * Examples:
 *   matchPathWithParams("/users/:id", "/users/42")   → { id: "42" }
 *   matchPathWithParams("/a/{b}/c",   "/a/x/c")      → { b: "x" }
 *   matchPathWithParams("/users/:id", "/users")       → null
 */
export function matchPathWithParams(
  template: string,
  request: string,
): Record<string, string> | null {
  const tSegs = normalizePathname(template).split("/").filter(Boolean);
  const rSegs = normalizePathname(request).split("/").filter(Boolean);
  if (tSegs.length !== rSegs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < tSegs.length; i++) {
    const t = tSegs[i]!;
    const r = rSegs[i]!;
    // :param or {param}
    const paramName = t.startsWith(":") ? t.slice(1) : t.startsWith("{") && t.endsWith("}") ? t.slice(1, -1) : null;
    if (paramName) {
      params[paramName] = decodeURIComponent(r);
    } else if (t !== r) {
      return null;
    }
  }
  return params;
}

export function requestPathnameFromInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "/";
  try {
    const u = new URL(t);
    return normalizePathname(u.pathname + u.search);
  } catch {
    return normalizePathname(t.split("?")[0] ?? t);
  }
}
