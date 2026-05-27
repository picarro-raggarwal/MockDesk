/** Shared path rules for companion + live mock gateway. */

/**
 * Match a request pathname against a template that may contain :param or {param} segments.
 * Returns extracted param map on match, null on mismatch (segment count or literal mismatch).
 * @param {string} template  e.g. "/users/:id/orders"
 * @param {string} request   e.g. "/users/42/orders"
 * @returns {Record<string,string>|null}
 */
export function matchPathWithParams(template, request) {
  const norm = (s) => {
    if (!s || s === "/") return "/";
    let p = String(s).trim();
    if (!p.startsWith("/")) p = `/${p}`;
    p = p.replace(/\/+/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  };
  const tSegs = norm(template).split("/").filter(Boolean);
  const rSegs = norm(request).split("/").filter(Boolean);
  if (tSegs.length !== rSegs.length) return null;
  const params = {};
  for (let i = 0; i < tSegs.length; i++) {
    const t = tSegs[i];
    const r = rSegs[i];
    const paramName = t.startsWith(":") ? t.slice(1)
      : (t.startsWith("{") && t.endsWith("}")) ? t.slice(1, -1)
      : null;
    if (paramName) {
      try { params[paramName] = decodeURIComponent(r); } catch { params[paramName] = r; }
    } else if (t !== r) {
      return null;
    }
  }
  return params;
}

export function normalizePathname(input) {
  if (!input || input === "/") return "/";
  let p = String(input).trim();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/+/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

export function joinBaseAndPath(baseUrl, endpointPath) {
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

export function apiMatchPath(baseUrl, pathVersionPrefix, endpointPath) {
  let pathname = "/";
  try {
    const u = new URL(baseUrl);
    pathname = u.pathname || "/";
  } catch {
    pathname = normalizePathname(baseUrl);
  }
  const base = pathname === "/" ? "" : pathname;
  const vpRaw = pathVersionPrefix?.trim?.() ?? "";
  const vp = vpRaw ? normalizePathname(vpRaw) : "";
  const ep = normalizePathname(endpointPath);
  if (!vp || vp === "/") {
    return joinBaseAndPath(baseUrl, endpointPath);
  }
  const mid = `${base}${vp}`;
  if (ep === "/") return normalizePathname(mid) || "/";
  return normalizePathname(`${mid}${ep}`);
}

export function pickScenario(wsScenarios, pathname) {
  const norm = normalizePathname(pathname);
  const exact = wsScenarios.find((s) => normalizePathname(s.path) === norm);
  if (exact) return exact;
  return wsScenarios[0] ?? null;
}

/** For 404 hints: resolved method + pathname per API. */
export function listRegisteredPaths(apis) {
  return (Array.isArray(apis) ? apis : []).map((api) => ({
    method: String(api.method || "GET").toUpperCase(),
    path: normalizePathname(apiMatchPath(api.baseUrl, api.pathVersionPrefix ?? "", api.path)),
  }));
}
