import { compressToEncodedURIComponent } from "lz-string";
import { parseImportJson } from "@/store/useAppStore";
import type { ParsedExport } from "@/services/importExportSchema";
import { formatJsonString } from "@/utils/json";

const PENDING_JSON_KEY = "mockdesk-pending-share-json";
const PENDING_PHASE_KEY = "mockdesk-pending-share-phase";

export const SHARE_LINK_JSON_MAX = 50_000;

export type StagedShare = { json: string; parsed: ParsedExport };

export type PendingSharePhase = "review" | "import";

export type ShareHydrateResult =
  | { type: "none" }
  | { type: "invalid"; paste: string; error: string }
  | { type: "ready"; staged: StagedShare; openReview: boolean };

function readSession(): { json: string; phase: PendingSharePhase } | null {
  try {
    const json = sessionStorage.getItem(PENDING_JSON_KEY);
    if (!json) return null;
    const phaseRaw = sessionStorage.getItem(PENDING_PHASE_KEY);
    const phase: PendingSharePhase = phaseRaw === "import" ? "import" : "review";
    return { json, phase };
  } catch {
    return null;
  }
}

export function clearPendingShareSession() {
  try {
    sessionStorage.removeItem(PENDING_JSON_KEY);
    sessionStorage.removeItem(PENDING_PHASE_KEY);
  } catch {
    /* private mode / blocked */
  }
}

export function writePendingShareSession(json: string, phase: PendingSharePhase = "review") {
  try {
    sessionStorage.setItem(PENDING_JSON_KEY, json);
    sessionStorage.setItem(PENDING_PHASE_KEY, phase);
  } catch {
    /* private mode / blocked */
  }
}

export function setPendingSharePhase(phase: PendingSharePhase) {
  try {
    sessionStorage.setItem(PENDING_PHASE_KEY, phase);
  } catch {
    /* ignore */
  }
}

export function formatJsonForPaste(text: string): string {
  const formatted = formatJsonString(text);
  return formatted.ok ? formatted.formatted : text;
}

export function importBodyFromPaste(staged: StagedShare | null, paste: string): string {
  return paste.trim().length > 0 ? paste : (staged?.json ?? "");
}

export function hydrateShareFromSession(): ShareHydrateResult {
  const pending = readSession();
  if (!pending) return { type: "none" };

  const pretty = formatJsonForPaste(pending.json);
  const parsed = parseImportJson(pending.json);
  if ("error" in parsed) {
    clearPendingShareSession();
    return { type: "invalid", paste: pretty, error: parsed.error };
  }

  return {
    type: "ready",
    staged: { json: pretty, parsed },
    openReview: pending.phase === "review",
  };
}

export function buildShareImportUrl(origin: string, rawJson: string): string | { error: "too_large" } {
  if (rawJson.length > SHARE_LINK_JSON_MAX) return { error: "too_large" };
  try {
    const enc = compressToEncodedURIComponent(rawJson);
    return `${origin}/import-export?share=${enc}`;
  } catch {
    return { error: "too_large" };
  }
}

export function snapshotCounts(parsed: ParsedExport) {
  return {
    collections: parsed.collections.length,
    apis: parsed.apis.length,
    environments: parsed.environments.length,
    wsScenarios: parsed.wsScenarios.length,
  };
}

export function formatShareSnapshotLine(counts: ReturnType<typeof snapshotCounts>): string {
  const col = counts.collections;
  const api = counts.apis;
  const env = counts.environments;
  return `${col} collection${col === 1 ? "" : "s"} · ${api} API${api === 1 ? "" : "s"} · ${env} env${env === 1 ? "" : "s"} · ${counts.wsScenarios} WS`;
}
