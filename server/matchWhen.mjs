/**
 * Picks a mock response from an API using the same rules as the in-app mock engine:
 * first response whose matchWhen matches (headers / query / bodyContains), else defaultResponseId,
 * else first response with no matchWhen rules, else first response.
 */

/** @param {import("http").IncomingMessage} req */
export function lowerHeaderMap(req) {
  const out = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(",") : String(v);
  }
  return out;
}

/** @param {URL} u */
export function queryFromUrl(u) {
  const out = {};
  if (!u?.searchParams) return out;
  for (const [k, v] of u.searchParams.entries()) {
    if (!(k in out)) out[k] = v;
  }
  return out;
}

function hasWhenRules(w) {
  if (!w || typeof w !== "object") return false;
  const h = w.headers && Object.keys(w.headers).length > 0;
  const q = w.query && Object.keys(w.query).length > 0;
  const b = Boolean(w.bodyContains && String(w.bodyContains).trim());
  return Boolean(h || q || b);
}

function matchesWhen(when, ctx) {
  if (when.headers) {
    for (const [k, v] of Object.entries(when.headers)) {
      if ((ctx.headers[k.toLowerCase()] ?? "") !== v) return false;
    }
  }
  if (when.query) {
    for (const [k, v] of Object.entries(when.query)) {
      if ((ctx.query[k] ?? "") !== String(v)) return false;
    }
  }
  if (when.bodyContains) {
    if (!ctx.requestBody.includes(when.bodyContains)) return false;
  }
  return true;
}

export function apiUsesBodyContains(api) {
  for (const r of api.responses ?? []) {
    const w = r.matchWhen;
    if (w?.bodyContains && String(w.bodyContains).trim()) return true;
  }
  return false;
}

/**
 * @param {object} api
 * @param {{ headers: Record<string, string>; query: Record<string, string>; requestBody: string }} ctx
 */
export function pickMatchedResponse(api, ctx) {
  const responses = Array.isArray(api.responses) ? api.responses : [];
  for (const r of responses) {
    if (r.matchWhen && hasWhenRules(r.matchWhen) && matchesWhen(r.matchWhen, ctx)) {
      return r;
    }
  }
  const def = api.defaultResponseId;
  const byId = def ? responses.find((r) => r.id === def) : undefined;
  const fallback = responses.find((r) => !r.matchWhen || !hasWhenRules(r.matchWhen));
  return byId ?? fallback ?? responses[0] ?? null;
}
