import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { getLiveMockSyncSecret, getLiveMockSyncUrl } from "@/constants/liveMock";

const DEBOUNCE_MS = 350;

/**
 * Pushes apis, environments, currentEnvId, and wsScenarios to the live mock gateway whenever
 * the workspace changes (debounced). Requires `npm run live-mock` (or compatible server on the sync URL).
 */
export function LiveMockSync() {
  const syncUrl = useMemo(() => getLiveMockSyncUrl(), []);
  const secret = useMemo(() => getLiveMockSyncSecret(), []);

  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const slice = useAppStore(
    useShallow((s) => ({
      apis: s.apis,
      environments: s.environments,
      currentEnvId: s.currentEnvId,
      wsScenarios: s.wsScenarios,
    })),
  );

  const sliceRef = useRef(slice);
  sliceRef.current = slice;

  useEffect(() => {
    if (!syncUrl || !hydrated) return;

    const t = window.setTimeout(() => {
      const { apis, environments, currentEnvId, wsScenarios } = sliceRef.current;
      const body = JSON.stringify({
        version: "1.1" as const,
        exportedAt: new Date().toISOString(),
        apis,
        environments,
        currentEnvId,
        wsScenarios,
      });
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) headers["x-mockdesk-sync"] = secret;

      void fetch(syncUrl, { method: "POST", headers, body }).then((r) => {
        if (!r.ok) {
          console.warn(`[MockDesk live-mock] sync failed: ${r.status} ${r.statusText}`);
        }
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [syncUrl, secret, hydrated, slice]);

  return null;
}
