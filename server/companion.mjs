#!/usr/bin/env node
/**
 * MockDesk companion: HTTP mocks + WebSocket scenario streaming from a v1.1 export JSON.
 *
 * HTTP: method + resolved pathname; picks response using matchWhen (query / headers / bodyContains)
 *   when rules exist, otherwise defaultResponseId / unconditioned fallback — same order as the in-app mock engine.
 *   Applies delayMs, then `{{env:…}}`, `{{KEY}}`, and `{{faker:…}}` substitution using export environments + currentEnvId.
 * WebSocket: connect to ws://HOST:PORT{scenario.path} — replays that scenario's messages (delayMs between sends).
 *
 * Usage: node server/companion.mjs [mockdesk-export.json]
 *   If the JSON path is omitted, loads fixtures/mockdesk-wms-smoke.json (sample GET /api/health and /api/users).
 * For UI-driven updates without a file, use `npm run live-mock` instead.
 * Env:
 *   PORT (default 8787) — HTTP + WebSocket on same port
 *   MOCKDESK_WS_LOOP=1 — after finishing a scenario, replay again until the client disconnects
 *   MOCKDESK_CORS_ORIGIN — optional fixed Access-Control-Allow-Origin (e.g. https://app.example.com).
 *     If unset, the server reflects the request Origin when present (browser apps on another port),
 *     otherwise uses * for non-browser clients.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { buildEnvVariableMap, substituteTemplates } from "./substitution.mjs";
import { normalizePathname, apiMatchPath, pickScenario, listRegisteredPaths } from "./pathMatching.mjs";
import { lowerHeaderMap, queryFromUrl, pickMatchedResponse, apiUsesBodyContains } from "./matchWhen.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE = path.join(__dirname, "..", "fixtures", "mockdesk-wms-smoke.json");
const MAX_HTTP_BODY = 2 * 1024 * 1024;

/** CORS so browser apps on another origin can call REST mocks on this server. */
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

function readHttpBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let len = 0;
    req.on("data", (c) => {
      len += c.length;
      if (len > MAX_HTTP_BODY) {
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

const file = process.argv[2] || DEFAULT_FIXTURE;
if (!fs.existsSync(file)) {
  console.error(`MockDesk companion: file not found: ${file}`);
  process.exit(1);
}

const raw = fs.readFileSync(file, "utf8");
const data = JSON.parse(raw);
const apis = Array.isArray(data.apis) ? data.apis : [];
const wsScenarios = Array.isArray(data.wsScenarios) ? data.wsScenarios : [];
const envVarMap = buildEnvVariableMap(data.environments ?? [], data.currentEnvId ?? null);
const PORT = Number(process.env.PORT || 8787);
const BIND = process.env.MOCKDESK_BIND?.trim() || "0.0.0.0";

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

  const headers = lowerHeaderMap(req);
  const query = queryFromUrl(u);

  for (const api of apis) {
    if (String(api.method).toUpperCase() !== method) continue;
    const full = apiMatchPath(api.baseUrl, api.pathVersionPrefix ?? "", api.path);
    if (normalizePathname(full) === reqPath) {
      let requestBody = "";
      if (method !== "GET" && method !== "HEAD" && apiUsesBodyContains(api)) {
        try {
          requestBody = await readHttpBody(req);
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
      const substituted = substituteTemplates(String(dr.bodyJson ?? ""), envVarMap);
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
  }

  res.writeHead(404, { "content-type": "application/json", ...corsHeaders(req) });
  res.end(
    JSON.stringify({
      message: "No mock matched this method and path",
      request: { method, path: reqPath },
      registered: listRegisteredPaths(apis),
      hint: "Host in each API baseUrl is ignored for matching — only method + pathname. Re-export JSON or fix paths.",
    }),
  );
}

const server = http.createServer((req, res) => {
  void handleHttp(req, res).catch((err) => {
    console.error(err);
    try {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json", ...corsHeaders(req) });
        res.end(JSON.stringify({ message: "Internal companion error" }));
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

  wss.handleUpgrade(request, socket, head, (ws) => {
    if (wsScenarios.length === 0) {
      ws.send(JSON.stringify({ type: "mockdesk.error", message: "No wsScenarios in this export file." }));
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
  console.error(`MockDesk companion: listening on http://${BIND === "0.0.0.0" ? "127.0.0.1" : BIND}:${PORT} (bind ${BIND}, PORT from env or 8787)`);
  console.error(`  Data file: ${file}`);
  console.error(`  HTTP: ${apis.length} API(s) — matchWhen (query/headers/body) + defaultResponseId; {{env:…}} / {{faker:…}} / {{var}} from export environments`);
  if (wsScenarios.length) {
    console.error(`  WebSocket: ${wsScenarios.length} scenario(s) — connect using path suffix, e.g.`);
    for (const s of wsScenarios) {
      const p = normalizePathname(s.path);
      console.error(`    ws://127.0.0.1:${PORT}${p === "/" ? "" : p}  (${s.name})`);
    }
  } else {
    console.error("  WebSocket: no wsScenarios in file; WS upgrades will respond with an error.");
  }
});
