import type { HttpMethod, MockApi, MockResponse } from "@/types/models";
import { newId, nowIso } from "@/lib/utils";
import { getCompanionApiBaseUrl, getCompanionHttpOrigin } from "@/constants/companion";

type OasOp = {
  responses?: Record<string, { content?: Record<string, { example?: unknown; schema?: unknown }> }>;
};

function exampleToJson(ex: unknown): string {
  if (ex === undefined) return "{}";
  try {
    return JSON.stringify(ex, null, 2);
  } catch {
    return "{}";
  }
}

function inferBaseFromServers(servers: unknown): string {
  const origin = getCompanionHttpOrigin();
  if (Array.isArray(servers) && servers[0]?.url) {
    const u = String(servers[0].url).replace(/\/$/, "");
    return u.startsWith("http") ? u : `${origin}${u.startsWith("/") ? u : `/${u}`}`;
  }
  return getCompanionApiBaseUrl();
}

/**
 * Minimal OpenAPI 3.x JSON → MockDesk APIs (best-effort).
 */
export function importOpenApiToApis(doc: unknown, collectionId: string | null): MockApi[] {
  if (!doc || typeof doc !== "object") return [];
  const d = doc as Record<string, unknown>;
  const paths = d.paths as Record<string, Record<string, OasOp>> | undefined;
  if (!paths || typeof paths !== "object") return [];
  const baseUrl = inferBaseFromServers(d.servers);
  const methods = new Set(["get", "post", "put", "patch", "delete"]);
  const t = nowIso();
  const out: MockApi[] = [];

  for (const [p, item] of Object.entries(paths)) {
    if (!item || typeof item !== "object") continue;
    for (const [m, op] of Object.entries(item)) {
      if (!methods.has(m.toLowerCase())) continue;
      const method = m.toUpperCase() as HttpMethod;
      const res200 = op?.responses?.["200"] ?? op?.responses?.["201"];
      const jsonContent =
        res200?.content?.["application/json"] ??
        res200?.content?.["*/*"] ??
        res200?.content?.[Object.keys(res200?.content ?? {})[0] ?? ""];
      const example = jsonContent?.example ?? jsonContent?.schema;
      const bodyJson = exampleToJson(example);

      const r: MockResponse = {
        id: newId(),
        statusCode: 200,
        delayMs: 0,
        responseType: "success",
        bodyJson,
      };

      const api: MockApi = {
        id: newId(),
        collectionId,
        name: (op as { summary?: string })?.summary || `${method} ${p}`,
        baseUrl,
        path: p.startsWith("/") ? p : `/${p}`,
        pathVersionPrefix: "",
        method,
        description: typeof (op as { description?: string }).description === "string" ? (op as { description: string }).description : "",
        tags: Array.isArray((op as { tags?: string[] }).tags) ? (op as { tags: string[] }).tags : [],
        headers: [{ id: newId(), key: "", value: "" }],
        queryParams: [{ id: newId(), key: "", value: "" }],
        requestBodySchema: "",
        responses: [r],
        defaultResponseId: r.id,
        environmentId: null,
        createdAt: t,
        updatedAt: t,
      };
      out.push(api);
    }
  }
  return out;
}

export function exportApisToOpenApi(apis: MockApi[]): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const a of apis) {
    const pathKey = a.path.startsWith("/") ? a.path : `/${a.path}`;
    paths[pathKey] ??= {};
    const opObj: Record<string, unknown> = {
      summary: a.name,
      description: a.description || undefined,
      tags: a.tags.length ? a.tags : undefined,
      responses: {},
    };
    const def = a.responses.find((r) => r.id === a.defaultResponseId) ?? a.responses[0];
    if (def) {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(def.bodyJson || "{}");
      } catch {
        parsed = { _raw: def.bodyJson };
      }
      (opObj.responses as Record<string, unknown>)[String(def.statusCode)] = {
        description: def.name || "Mock response",
        content: {
          "application/json": {
            example: parsed,
          },
        },
      };
    }
    paths[pathKey][a.method.toLowerCase()] = opObj;
  }
  return {
    openapi: "3.0.3",
    info: { title: "MockDesk export", version: "1.0.0" },
    paths,
  };
}
