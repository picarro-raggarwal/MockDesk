/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Base WebSocket URL for the Node companion (no trailing slash), e.g. ws://127.0.0.1:8787 */
  readonly VITE_COMPANION_WS_ORIGIN?: string;
  /** Base HTTP URL for the Node companion (no trailing slash), e.g. http://127.0.0.1:8787 — used for API base URLs and external-mock hints */
  readonly VITE_COMPANION_HTTP_ORIGIN?: string;
  /** POST target for live mock gateway (full URL including /__mockdesk/sync). Overrides dev default when set. */
  readonly VITE_LIVE_MOCK_SYNC_URL?: string;
  /** Set to "0" to disable pushing workspace to the live gateway (including dev default). */
  readonly VITE_LIVE_MOCK_SYNC?: string;
  /** Optional; must match MOCKDESK_SYNC_SECRET on the gateway when sync auth is enabled. */
  readonly VITE_LIVE_MOCK_SYNC_SECRET?: string;
}
