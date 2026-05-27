/**
 * When set, the MockDesk UI POSTs the current mocks to the live gateway on change.
 * Set VITE_LIVE_MOCK_SYNC=0 to disable. In dev, defaults to http://127.0.0.1:8787/__mockdesk/sync.
 */
export function getLiveMockSyncUrl(): string | null {
  if (import.meta.env.VITE_LIVE_MOCK_SYNC === "0") return null;
  const explicit = (import.meta.env.VITE_LIVE_MOCK_SYNC_URL as string | undefined)?.trim();
  if (explicit) return explicit;
  if (import.meta.env.DEV) return "http://127.0.0.1:8787/__mockdesk/sync";
  return null;
}

/** Sent as x-mockdesk-sync when MOCKDESK_SYNC_SECRET is set on the gateway. */
export function getLiveMockSyncSecret(): string | undefined {
  const s = (import.meta.env.VITE_LIVE_MOCK_SYNC_SECRET as string | undefined)?.trim();
  return s || undefined;
}
