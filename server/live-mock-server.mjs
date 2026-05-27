#!/usr/bin/env node
/**
 * MockDesk live mock gateway: same HTTP/WS behavior as the file-based companion, but the UI
 * pushes state here via POST /__mockdesk/sync so external clients always see the latest mocks without export/restart.
 * HTTP responses honor matchWhen (query / headers / bodyContains) like the in-app Playground.
 *
 * Usage: node server/live-mock-server.mjs
 * Env: PORT (8787), MOCKDESK_BIND (0.0.0.0), MOCKDESK_WS_LOOP, MOCKDESK_CORS_ORIGIN,
 *      MOCKDESK_SYNC_SECRET — if set, POST /__mockdesk/sync must send header x-mockdesk-sync: <secret>
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { buildEnvVariableMap, substituteTemplates } from "./substitution.mjs";
import { normalizePathname, apiMatchPath, matchPathWithParams, pickScenario, listRegisteredPaths } from "./pathMatching.mjs";
import { lowerHeaderMap, queryFromUrl, pickMatchedResponse, apiUsesBodyContains } from "./matchWhen.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE = path.join(__dirname, "..", "fixtures", "mockdesk-wms-smoke.json");
const SYNC_PATH = "/__mockdesk/sync";
const MAX_BODY = 12 * 1024 * 1024;

const PORT = Number(process.env.PORT || 8787);
const BIND = process.env.MOCKDESK_BIND?.trim() || "0.0.0.0";
const SYNC_SECRET = process.env.MOCKDESK_SYNC_SECRET?.trim();

function loadInitialSnapshot() {
  try {
    const raw = fs.readFileSync(DEFAULT_FIXTURE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { apis: [], environments: [], currentEnvId: null, wsScenarios: [] };
  }
}

let snapshot = loadInitialSnapshot();

function corsHeaders(req) {
  const fixed = process.env.MOCKDESK_CORS_ORIGIN?.trim();
  const allowOrigin = fixed || req.headers.origin || "*";
  const requestHeaders = req.headers["access-control-request-headers"];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": requestHeaders || "Content-Type, Authorization, Accept, x-mockdesk-sync",
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let len = 0;
    req.on("data", (c) => {
      len += c.length;
      if (len > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function streamScenarioToClient(ws, scenario) {
  const loop = process.env.MOCKDESK_WS_LOOP === "1";
  const sendOnce = async () => {
    for (const m of scenario.messages ?? []) {
      if (ws.readyState !== 1) return;
      await new Promise((r) => setTimeout(r, Number(m.delayMs) || 0));
      if (ws.readyState !== 1) return;
      ws.send(typeof m.payloadJson === "string" ? m.payloadJson : JSON.stringify(m.payloadJson));
    }
    if (ws.readyState === 1) {
      ws.send(
        JSON.stringify({
          type: "mockdesk.eos",
          scenario: scenario.name,
          message: "Scenario replay finished; connection stays open until you close it.",
        }),
      );
    }
  };
  do {
    await sendOnce();
  } while (loop && ws.readyState === 1);
}

async function handleHttp(req, res) {
  const method = (req.method || "GET").toUpperCase();
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  /** @type {URL} */
  let u;
  let reqPath = "/";
  try {
    u = new URL(req.url || "/", `http://${host}`);
    reqPath = normalizePathname(u.pathname);
  } catch {
    u = new URL("/", `http://${host}`);
    reqPath = "/";
  }

  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  if (reqPath === SYNC_PATH) {
    if (method === "GET") {
      const apis = Array.isArray(snapshot.apis) ? snapshot.apis : [];
      const wsScenarios = Array.isArray(snapshot.wsScenarios) ? snapshot.wsScenarios : [];
      res.writeHead(200, { "content-type": "application/json", ...corsHeaders(req) });
      res.end(
        JSON.stringify({
          ok: true,
          mode: "live-mock-gateway",
          apiCount: apis.length,
          wsScenarioCount: wsScenarios.length,
          syncPath: SYNC_PATH,
        }),
      );
      return;
    }
    if (method !== "POST") {
      res.writeHead(405, { "content-type": "application/json", ...corsHeaders(req) });
      res.end(JSON.stringify({ message: "Method not allowed" }));
      return;
    }
    if (SYNC_SECRET) {
      const token = req.headers["x-mockdesk-sync"];
      if (token !== SYNC_SECRET) {
        res.writeHead(401, { "content-type": "application/json", ...corsHeaders(req) });
        res.end(JSON.stringify({ message: "Invalid or missing x-mockdesk-sync header" }));
        return;
      }
    }
    let text;
    try {
      text = await readBody(req);
    } catch {
      res.writeHead(413, { "content-type": "application/json", ...corsHeaders(req) });
      res.end(JSON.stringify({ message: "Body too large" }));
      return;
    }
    let data;
    try {
      data = JSON.parse(text || "{}");
    } catch {
      res.writeHead(400, { "content-type": "application/json", ...corsHeaders(req) });
      res.end(JSON.stringify({ message: "Invalid JSON" }));
      return;
    }
    if (!Array.isArray(data.apis)) {
      res.writeHead(400, { "content-type": "application/json", ...corsHeaders(req) });
      res.end(JSON.stringify({ message: "Body must include apis array (v1.1 export shape)" }));
      return;
    }
    snapshot = {
      apis: data.apis,
      environments: Array.isArray(data.environments) ? data.environments : [],
      currentEnvId: data.currentEnvId ?? null,
      wsScenarios: Array.isArray(data.wsScenarios) ? data.wsScenarios : [],
    };
    res.writeHead(200, { "content-type": "application/json", ...corsHeaders(req) });
    res.end(JSON.stringify({ ok: true, apiCount: snapshot.apis.length, wsScenarioCount: snapshot.wsScenarios.length }));
    return;
  }

  const apis = Array.isArray(snapshot.apis) ? snapshot.apis : [];
  const environments = snapshot.environments ?? [];
  const globalEnvVarMap = buildEnvVariableMap(environments, snapshot.currentEnvId ?? null);

  const headers = lowerHeaderMap(req);
  const query = queryFromUrl(u);

  for (const api of apis) {
    if (String(api.method).toUpperCase() !== method) continue;
    const templatePath = normalizePathname(apiMatchPath(api.baseUrl, api.pathVersionPrefix ?? "", api.path));
    const extractedParams = matchPathWithParams(templatePath, reqPath);
    if (extractedParams === null) continue;

    let requestBody = "";
    if (method !== "GET" && method !== "HEAD" && apiUsesBodyContains(api)) {
      try {
        requestBody = await readBody(req);
      } catch {
        res.writeHead(413, { "content-type": "application/json", ...corsHeaders(req) });
        res.end(JSON.stringify({ message: "Body too large" }));
        return;
      }
    }
    const dr = pickMatchedResponse(api, { headers, query, requestBody });
    if (!dr) {
      res.writeHead(500, { "content-type": "application/json", ...corsHeaders(req) });
      res.end(JSON.stringify({ message: "No response on matched API" }));
      return;
    }
    const delayMs = Math.max(0, Number(dr.delayMs) || 0);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    // Per-API environment override: use the API's own env if set, else fall back to the global one.
    const baseEnv = api.environmentId
      ? buildEnvVariableMap(environments, api.environmentId)
      : globalEnvVarMap;
    // Merge extracted path params into the substitution env so {{params.id}} and {{id}} both work.
    const paramEnv = { ...baseEnv };
    for (const [k, v] of Object.entries(extractedParams)) {
      paramEnv[`params.${k}`] = v;
      if (!(k in paramEnv)) paramEnv[k] = v;
    }
    const substituted = substituteTemplates(String(dr.bodyJson ?? ""), paramEnv);
    let body;
    try {
      body = JSON.parse(substituted);
    } catch {
      body = { message: "Invalid JSON in mock response", raw: substituted };
    }
    res.writeHead(Number(dr.statusCode) || 200, { "content-type": "application/json", ...corsHeaders(req) });
    res.end(JSON.stringify(body));
    return;
  }

  res.writeHead(404, { "content-type": "application/json", ...corsHeaders(req) });
  res.end(
    JSON.stringify({
      message: "No mock matched this method and path",
      request: { method, path: reqPath },
      registered: listRegisteredPaths(apis),
      hint:
        "With live-mock, open MockDesk (npm run dev) so the UI syncs your workspace, or add this path in the UI and wait ~350ms.",
    }),
  );
}

const server = http.createServer((req, res) => {
  void handleHttp(req, res).catch((err) => {
    console.error(err);
    try {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json", ...corsHeaders(req) });
        res.end(JSON.stringify({ message: "Internal gateway error" }));
      }
    } catch {
      /* ignore */
    }
  });
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  if (request.headers.upgrade !== "websocket") {
    socket.destroy();
    return;
  }
  const host = request.headers.host || `127.0.0.1:${PORT}`;
  let pathname = "/";
  try {
    pathname = normalizePathname(new URL(request.url || "/", `http://${host}`).pathname);
  } catch {
    pathname = "/";
  }

  if (pathname === SYNC_PATH) {
    socket.destroy();
    return;
  }

  const wsScenarios = Array.isArray(snapshot.wsScenarios) ? snapshot.wsScenarios : [];

  wss.handleUpgrade(request, socket, head, (ws) => {
    if (wsScenarios.length === 0) {
      ws.send(JSON.stringify({ type: "mockdesk.error", message: "No wsScenarios in live snapshot." }));
      ws.close(1011, "no scenarios");
      return;
    }
    const scenario = pickScenario(wsScenarios, pathname);
    if (!scenario) {
      ws.send(JSON.stringify({ type: "mockdesk.error", message: "Could not resolve scenario." }));
      ws.close(1011, "no scenario");
      return;
    }
    ws.send(
      JSON.stringify({
        type: "mockdesk.open",
        scenario: scenario.name,
        path: scenario.path,
        messageCount: scenario.messages?.length ?? 0,
      }),
    );
    void streamScenarioToClient(ws, scenario).catch(() => {
      try {
        ws.close(1011, "stream error");
      } catch {
        /* ignore */
      }
    });
  });
});

server.listen(PORT, BIND, () => {
  console.error(`MockDesk live-mock-gateway: http://${BIND === "0.0.0.0" ? "127.0.0.1" : BIND}:${PORT}`);
  console.error(`  Push from UI: POST ${SYNC_PATH} (JSON v1.1 slice: apis, environments, currentEnvId, wsScenarios)`);
  if (SYNC_SECRET) console.error("  Sync auth: header x-mockdesk-sync required");
  console.error(`  Status: GET ${SYNC_PATH}`);
  const apis = Array.isArray(snapshot.apis) ? snapshot.apis : [];
  const wsScenarios = Array.isArray(snapshot.wsScenarios) ? snapshot.wsScenarios : [];
  console.error(`  Bootstrapped: ${apis.length} API(s), ${wsScenarios.length} WS scenario(s) from default fixture`);
  console.error(
    "  HTTP: conditional responses use matchWhen (query / headers / bodyContains), same as the app Playground — restart this process after git pull if mocks behave oddly.",
  );
});
