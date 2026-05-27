/** No trailing slash. Used in API base URLs and Import/Export copy for external HTTP clients. */
export function getCompanionHttpOrigin(): string {
  const raw = import.meta.env.VITE_COMPANION_HTTP_ORIGIN as string | undefined;
  return (raw?.trim() || "http://127.0.0.1:8787").replace(/\/$/, "");
}

/** Path prefix that matches the companion’s HTTP pathname rules (same as sample mocks). */
export function getCompanionApiBaseUrl(): string {
  return `${getCompanionHttpOrigin()}/api`;
}
