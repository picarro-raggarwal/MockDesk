import type { AppEnvironment, MockApi, MockResponse } from "@/types/models";
import { apiMatchPath, matchPathWithParams, normalizePathname, requestPathnameFromInput } from "@/utils/pathJoin";
import { tryParseJson } from "@/utils/json";
import { substituteTemplates, type VarMap } from "@/services/substitution";
import { buildEnvVariableMap } from "@/store/useAppStore";

export interface MockRequestContext {
  /** Normalized lower-case header map */
  headers: Record<string, string>;
  /** Query key → value (first value) */
  query: Record<string, string>;
  requestBody: string;
  /** Path param values extracted from :param / {param} segments */
  params: Record<string, string>;
}

export interface MockHit {
  api: MockApi;
  responseId: string;
  statusCode: number;
  delayMs: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface MockMiss {
  statusCode: 404;
  body: { message: string };
}

export type MockResult = MockHit | MockMiss;

function headersToRecord(pairs: { key: string; value: string }[]): Record<string, string> {
  const out: Record<string, string> = { "content-type": "application/json" };
  for (const { key, value } of pairs) {
    const k = key.trim();
    if (k) out[k.toLowerCase()] = value;
  }
  return out;
}

function parseQueryFromUrl(urlOrPath: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const u = new URL(urlOrPath);
    u.searchParams.forEach((v, k) => {
      if (!(k in out)) out[k] = v;
    });
    return out;
  } catch {
    const q = urlOrPath.split("?")[1];
    if (!q) return out;
    for (const part of q.split("&")) {
      const [k, v] = part.split("=").map((s) => decodeURIComponent(s.replace(/\+/g, " ")));
      if (k && !(k in out)) out[k] = v ?? "";
    }
    return out;
  }
}

function normalizeHeaderMap(h: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    o[k.toLowerCase()] = v;
  }
  return o;
}

function matchesWhen(
  when: NonNullable<MockResponse["matchWhen"]>,
  ctx: MockRequestContext,
): boolean {
  if (when.headers) {
    for (const [k, v] of Object.entries(when.headers)) {
      if ((ctx.headers[k.toLowerCase()] ?? "") !== v) return false;
    }
  }
  if (when.query) {
    for (const [k, v] of Object.entries(when.query)) {
      if ((ctx.query[k] ?? "") !== v) return false;
    }
  }
  if (when.bodyContains) {
    if (!ctx.requestBody.includes(when.bodyContains)) return false;
  }
  return true;
}

function hasWhenRules(w: NonNullable<MockResponse["matchWhen"]>): boolean {
  const h = w.headers && Object.keys(w.headers).length > 0;
  const q = w.query && Object.keys(w.query).length > 0;
  const b = Boolean(w.bodyContains?.trim());
  return Boolean(h || q || b);
}

function pickResponse(api: MockApi, ctx: MockRequestContext): MockResponse | null {
  for (const r of api.responses) {
    if (r.matchWhen && hasWhenRules(r.matchWhen) && matchesWhen(r.matchWhen, ctx)) {
      return r;
    }
  }
  const def = api.defaultResponseId;
  const byId = def ? api.responses.find((r) => r.id === def) : undefined;
  const fallback = api.responses.find((r) => !r.matchWhen || !hasWhenRules(r.matchWhen));
  return byId ?? fallback ?? api.responses[0] ?? null;
}

export function buildRequestContext(
  urlOrPathInput: string,
  extraHeaders?: Record<string, string>,
  requestBody?: string,
  params?: Record<string, string>,
): MockRequestContext {
  const query = parseQueryFromUrl(urlOrPathInput);
  const headers = normalizeHeaderMap({ ...(extraHeaders ?? {}) });
  return {
    headers,
    query,
    requestBody: requestBody ?? "",
    params: params ?? {},
  };
}

export function matchMockRequest(
  method: string,
  urlOrPathInput: string,
  apis: MockApi[],
  ctx?: Partial<MockRequestContext>,
  env?: VarMap,
  environments?: AppEnvironment[],
): MockResult {
  const reqPathOnly = normalizePathname(requestPathnameFromInput(urlOrPathInput.split("?")[0] ?? urlOrPathInput));
  const upper = method.toUpperCase();
  const baseCtx = {
    headers: normalizeHeaderMap(ctx?.headers ?? {}),
    query: { ...parseQueryFromUrl(urlOrPathInput), ...ctx?.query },
    requestBody: ctx?.requestBody ?? "",
  };

  for (const api of apis) {
    if (api.method !== upper) continue;
    const templatePath = normalizePathname(apiMatchPath(api.baseUrl, api.pathVersionPrefix, api.path));
    const extractedParams = matchPathWithParams(templatePath, reqPathOnly);
    if (extractedParams === null) continue;

    const fullCtx: MockRequestContext = {
      ...baseCtx,
      params: { ...(ctx?.params ?? {}), ...extractedParams },
    };

    const res = pickResponse(api, fullCtx);
    if (!res) {
      return {
        statusCode: 404,
        body: { message: "No response configured for this endpoint" },
      };
    }
    // Per-API environment override: if the API has its own environmentId, resolve
    // that env's variables; otherwise fall back to the caller-supplied env map.
    const resolvedApiEnv =
      api.environmentId && environments?.length
        ? buildEnvVariableMap(environments, api.environmentId)
        : null;
    const mergedEnv: VarMap = resolvedApiEnv ? { ...resolvedApiEnv } : env ? { ...env } : {};
    // Expose params as top-level keys so {{id}} works alongside {{params.id}}
    for (const [k, v] of Object.entries(fullCtx.params)) {
      mergedEnv[`params.${k}`] = v;
      if (!(k in mergedEnv)) mergedEnv[k] = v;
    }
    const raw = substituteTemplates(res.bodyJson, mergedEnv);
    const parsed = tryParseJson(raw);
    const body = parsed.ok ? parsed.value : { message: "Invalid JSON in mock response", raw };
    return {
      api,
      responseId: res.id,
      statusCode: res.statusCode,
      delayMs: res.delayMs,
      body,
      headers: headersToRecord(api.headers),
    };
  }

  return {
    statusCode: 404,
    body: { message: "No mock matched this method and path" },
  };
}

export async function executeMockWithDelay(result: MockResult): Promise<MockResult> {
  if ("api" in result) {
    await new Promise((r) => setTimeout(r, result.delayMs));
  }
  return result;
}
