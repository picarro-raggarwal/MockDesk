import type { AppEnvironment, Collection, MockApi } from "@/types/models";
import { newId, nowIso } from "@/lib/utils";
import type { ParsedExport } from "@/services/importExportSchema";

export type AppExportSlice = Pick<
  { collections: Collection[]; apis: MockApi[]; environments: AppEnvironment[] },
  "collections" | "apis" | "environments"
>;

function cloneKeyValueRows<T extends { id: string; key: string; value: string }>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row, id: newId() }));
}

/** Safe filename segment from a collection name. */
export function collectionExportBasename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^-+|-+$/g, "") || "collection";
}

/**
 * Build a v1.1 export slice: one collection, its APIs, and any environments referenced by those APIs.
 */
export function buildCollectionExport(state: AppExportSlice, collectionId: string): ParsedExport | null {
  const col = state.collections.find((c) => c.id === collectionId);
  if (!col) return null;
  const apis = state.apis.filter((a) => a.collectionId === collectionId);
  const envIds = new Set(
    apis.map((a) => a.environmentId).filter((id): id is string => id !== null && id !== ""),
  );
  const environments = state.environments.filter((e) => envIds.has(e.id));
  return {
    version: "1.1",
    exportedAt: undefined,
    collections: [col],
    apis,
    environments,
    currentEnvId: null,
    wsScenarios: [],
  } as ParsedExport;
}

export function stringifyCollectionExport(payload: ParsedExport): string {
  return JSON.stringify(
    {
      ...payload,
      exportedAt: nowIso(),
    },
    null,
    2,
  );
}

/** Minified JSON for share links and other size-sensitive transports. */
export function stringifyCollectionExportCompact(payload: ParsedExport): string {
  return JSON.stringify({
    ...payload,
    exportedAt: nowIso(),
  });
}

/** True if payload is a single-collection package (merge-friendly handoff). */
export function isCollectionScopedExport(d: ParsedExport): boolean {
  if (d.collections.length !== 1) return false;
  const cid = d.collections[0].id;
  for (const a of d.apis) {
    if (a.collectionId != null && a.collectionId !== cid) return false;
  }
  return true;
}

/**
 * Clone a collection package with fresh IDs so merging does not overwrite existing workspace entities.
 */
export function remapCollectionPackageToNewIds(data: ParsedExport): ParsedExport | null {
  if (!isCollectionScopedExport(data)) return null;
  const col = data.collections[0];
  const t = nowIso();
  const newColId = newId();

  const envOldToNew = new Map<string, string>();
  const environments: AppEnvironment[] = data.environments.map((e) => {
    const nid = newId();
    envOldToNew.set(e.id, nid);
    return {
      ...e,
      id: nid,
      variables: cloneKeyValueRows(e.variables),
      createdAt: t,
      updatedAt: t,
    };
  });

  const newCollection: Collection = {
    ...col,
    id: newColId,
    createdAt: t,
    updatedAt: t,
  };

  const apis: MockApi[] = data.apis.map((api) => {
    const responseIdMap = new Map<string, string>();
    for (const r of api.responses) responseIdMap.set(r.id, newId());
    const responses = api.responses.map((r) => ({
      ...r,
      id: responseIdMap.get(r.id)!,
    }));
    let defaultResponseId: string | null = null;
    if (api.defaultResponseId) {
      defaultResponseId = responseIdMap.get(api.defaultResponseId) ?? responses[0]?.id ?? null;
    } else {
      defaultResponseId = responses[0]?.id ?? null;
    }
    const environmentId =
      api.environmentId && envOldToNew.has(api.environmentId) ? envOldToNew.get(api.environmentId)! : null;
    return {
      ...api,
      id: newId(),
      collectionId: newColId,
      environmentId,
      responses,
      defaultResponseId,
      headers: cloneKeyValueRows(api.headers),
      queryParams: cloneKeyValueRows(api.queryParams),
      createdAt: t,
      updatedAt: t,
    };
  });

  return {
    version: "1.1",
    exportedAt: undefined,
    collections: [newCollection],
    apis,
    environments,
    currentEnvId: null,
    wsScenarios: [],
  } as ParsedExport;
}
