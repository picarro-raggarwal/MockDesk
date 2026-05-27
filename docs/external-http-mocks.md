# External HTTP mocks (Node gateway)

Any HTTP client (tests, mobile apps, Postman, another web app) can call a **small Node server** in this repo. Use either the **live mock gateway** (the MockDesk UI pushes changes in dev) or the **file-based companion** (serve a static JSON export).

## Option A — Live gateway (UI stays in sync)

Best when the MockDesk UI and the consumer run on the same machine during development.

1. **Terminal 1** — from the MockDesk repo:

   ```bash
   npm install
   npm run live-mock
   ```

   Listens on **port 8787** on all interfaces (`0.0.0.0`). Loads a small smoke fixture until the UI syncs.

2. **Terminal 2** — start the MockDesk UI:

   ```bash
   npm run dev
   ```

   In **development**, the app **POSTs** your `apis`, `environments`, `currentEnvId`, and `wsScenarios` to `http://127.0.0.1:8787/__mockdesk/sync` whenever you edit (debounced). No export step.

3. **Consumer** — set its REST base URL to **`http://127.0.0.1:8787/api`** (or your `PORT` / LAN IP). Paths must match your mock APIs (base pathname + version prefix + path).

4. **Disable auto-sync** — in MockDesk `.env`: `VITE_LIVE_MOCK_SYNC=0`.

5. **Custom sync URL / production build** — set `VITE_LIVE_MOCK_SYNC_URL` at build time to your gateway URL (must include `/__mockdesk/sync`).

6. **Secure sync** — on the server: `MOCKDESK_SYNC_SECRET=some-long-secret`. In the UI `.env`: `VITE_LIVE_MOCK_SYNC_SECRET=some-long-secret` (same value).

**Do not run `live-mock` and `companion` on the same `PORT`.**

---

## Option B — File-based companion (export each time)

Good for CI or air‑gapped workflows.

1. Export JSON v1.1 from MockDesk (**Import / Export**).

2. ```bash
   npm run companion -- ./mockdesk-app.json
   ```

3. Point your client at the same origin + path prefix as in the file.

---

## Smoke check (default fixture)

With **only** the gateway or companion running (before UI sync, the default fixture is loaded):

```bash
curl -sS http://127.0.0.1:8787/api/health
```

---

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `PORT` | Server | Port (default `8787`). |
| `MOCKDESK_BIND` | Server | Listen address (default `0.0.0.0`). |
| `MOCKDESK_CORS_ORIGIN` | Server | Fixed `Access-Control-Allow-Origin` for browser clients. |
| `MOCKDESK_SYNC_SECRET` | Live gateway | If set, `POST /__mockdesk/sync` requires `x-mockdesk-sync` header. |
| `MOCKDESK_WS_LOOP` | Server | `1` = repeat WebSocket scenarios until disconnect. |
| `VITE_LIVE_MOCK_SYNC` | UI | `0` = disable pushing to the gateway. |
| `VITE_LIVE_MOCK_SYNC_URL` | UI | Full sync URL (overrides dev default). |
| `VITE_LIVE_MOCK_SYNC_SECRET` | UI | Must match `MOCKDESK_SYNC_SECRET` when used. |
| `VITE_COMPANION_HTTP_ORIGIN` | UI | Shown as default API base in the app. |

---

## Limits (gateway & companion)

- **HTTP response selection** follows the same rules as the in-app mock engine: any response whose **`matchWhen`** matches (query key/value, header key/value, or `bodyContains` on the request body) wins; otherwise the API’s **`defaultResponseId`** response is used, then any unconditional response.
- For **`bodyContains`** rules on non-GET requests, the server reads the request body (size-capped); GET/HEAD only use query + headers.
- Response bodies support **`{{env:…}}`**, **`{{KEY}}`**, **`{{faker:…}}`** from the **current** environments in the synced or exported data.
