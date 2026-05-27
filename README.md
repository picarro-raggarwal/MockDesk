# MockDesk

MockDesk is a **mock REST API workbench** for frontend teams. Define endpoints with paths, HTTP methods, multiple JSON responses, artificial delays, status codes, optional **path version prefixes**, and **conditional responses** (headers, query, body substring). Data persists in the browser (Zustand + localStorage), with **v1.1 JSON** import/export, **OpenAPI** import, **compressed share links**, and Node servers for **HTTP + WebSocket** outside the app: a **live mock gateway** (UI pushes changes to a local server) and a **file-based companion** (export JSON / CI).

## Stack

- React 18, TypeScript, Vite 5  
- Tailwind CSS, shadcn-style Radix UI primitives  
- Zustand + `persist` (localStorage) with merge migration for `pathVersionPrefix`  
- React Hook Form + Zod  
- Monaco Editor (JSON), lazy-loaded  
- Framer Motion, React Router 6  
- `@faker-js/faker`, `idb` (IndexedDB audit log), `lz-string` (share links), `js-yaml` (OpenAPI)  
- **PWA** via `vite-plugin-pwa` (auto-update service worker)  

## Scripts

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # output in dist/
npm run preview     # serve production build locally
npm run lint
npm run live-mock       # Live gateway: HTTP mocks on PORT; MockDesk UI auto-pushes in dev (see below)
npm run companion              # File-based HTTP + WebSocket; default: fixtures/mockdesk-wms-smoke.json on PORT (8787)
npm run companion -- ./path/to/mockdesk-app.json
```

**Live mock gateway (`npm run live-mock`)** — In **development**, the MockDesk UI **POSTs** your workspace to `http://127.0.0.1:8787/__mockdesk/sync` on every change (debounced). Any HTTP client can call the **same port** for REST mocks; no manual export/restart. **After `git pull`, restart this Node process** so gateway code (path rules, `matchWhen`, etc.) matches your checkout. Disable with `VITE_LIVE_MOCK_SYNC=0` in `.env`, or point elsewhere with `VITE_LIVE_MOCK_SYNC_URL`. For production builds, set `VITE_LIVE_MOCK_SYNC_URL` at **build time** if you need the same behavior. Optional **`MOCKDESK_SYNC_SECRET`** on the server + **`VITE_LIVE_MOCK_SYNC_SECRET`** in the UI secures the sync endpoint.

The **file-based companion** serves **HTTP** mocks (method + resolved pathname; **`matchWhen`** when set, else **`defaultResponseId`**; **`{{env:…}}` / `{{KEY}}` / `{{faker:…}}`** resolved from the export’s environments) and **WebSocket** replays of `wsScenarios` from the same JSON (path selects scenario; see WS lab → Live stream). Behavior matches the in-app mock engine for conditional responses.

Do not run **`live-mock` and `companion` on the same `PORT`** at once.

Optional: `MOCKDESK_WS_LOOP=1` replays a scenario in a loop until the client disconnects. Override the dev UI default URL with `VITE_COMPANION_WS_ORIGIN` (e.g. `ws://192.168.1.10:8787`).

### Connecting another app over REST

**Recommended:** run **`npm run live-mock`** in the MockDesk repo, then **`npm run dev`** (or keep the UI open). The UI **pushes** APIs, environments, and WS scenarios to the gateway automatically in dev, so external clients always see your latest mocks on **`http://127.0.0.1:8787`** (same rules as the companion: path + method matching, `matchWhen` when configured, CORS).

**Alternative (file-based):** **`npm run companion -- ./mockdesk-app.json`** after each export — good for CI or when you do not want the UI to talk to a server.

1. **Live path:** start **`npm run live-mock`**, align API base URLs with `http://127.0.0.1:8787/api` (or your `PORT` / `VITE_COMPANION_HTTP_ORIGIN`), edit mocks in the UI — clients call the gateway.
2. **File path:** **Export** JSON v1.1, run **`npm run companion -- ./mockdesk-app.json`**, point your client at that host/port.
3. **Align URLs:** each API’s **base URL pathname** + **path version prefix** + **endpoint path** must match what the client requests.
4. **Point the client** at that origin + prefix (e.g. `http://127.0.0.1:8787/api`).
5. **Browser clients:** CORS is enabled on the gateway; optional **`MOCKDESK_CORS_ORIGIN`** for a fixed allowlist.

Server-side clients do not need CORS. For machines other than localhost, use LAN IP / firewall as needed.

Step-by-step: [docs/external-http-mocks.md](docs/external-http-mocks.md).

## Features

- **Live mock gateway** — `npm run live-mock`; dev UI pushes mocks to the gateway without export (see README scripts)  
- **APIs** — search, method filter, “conditional responses only” filter, CRUD, tags, headers, query param docs, `pathVersionPrefix`, request body schema  
- **Responses** — multiple variants; status presets + custom; success/error type; delay (ms); Monaco JSON; **clone response**; **conditional `matchWhen`** (JSON editor, blur to save)  
- **Collections** — group APIs; search; duplicate collection (+ cloned APIs); delete uncategorizes APIs  
- **Environments** — variables for `{{KEY}}`, `{{env:KEY}}`, and `{{faker:...}}` in response bodies at match time  
- **WS lab** — script preview in the browser; **Live stream** tab connects to the companion WebSocket for the same payloads a real client would receive  
- **Mock engine** — pathname + method + optional `matchWhen`; templates via current environment  
- **Playground** — headers JSON, body text, timing  
- **Import / export** — JSON **v1.1** (collections, APIs, environments, `currentEnvId`, `wsScenarios`); merge preview; OpenAPI tab; **`?share=`** compressed payload (any route redirects to Import / Export)  
- **Settings** — full backup, danger zone, storage estimate  
- **Keyboard shortcuts** — `?` help; `g` then `a` / `p` / `i` / `e` for APIs, Playground, Import/Export, Environments (outside inputs)  
- **Theme** — light / dark (persisted)  

## JSON export (v1.1)

```json
{
  "version": "1.1",
  "exportedAt": "2026-05-26T12:00:00.000Z",
  "collections": [],
  "apis": [],
  "environments": [],
  "currentEnvId": null,
  "wsScenarios": []
}
```

`pathVersionPrefix` is stored on each API (string, may be empty). IDs and timestamps are preserved for team handoff.

## Matching rules

The runtime builds a path from each API’s **base URL pathname** + optional **version prefix** + **endpoint path**, normalized (slashes collapsed, no trailing slash except root). The Playground passes query and headers into **matchWhen** when picking a non-default response.

## Deploying (e.g. static host)

1. Run `npm run build`.  
2. Serve the `dist/` folder (nginx, S3 + CloudFront, etc.).  
3. The PWA registers a service worker for offline shell caching of static assets.  
4. Collaboration is via **export / share link / import** until a backend sync exists.

## Product name

**MockDesk** — developer-first UI inspired by Postman, Insomnia, and modern dashboards.
