import type { ParsedExport } from "@/services/importExportSchema";
import type { AppState } from "@/store/useAppStore";

export function summarizeMerge(current: AppState, incoming: ParsedExport) {
  const curApi = new Set(current.apis.map((a) => a.id));
  const curCol = new Set(current.collections.map((c) => c.id));
  return {
    newApis: incoming.apis.filter((a) => !curApi.has(a.id)).length,
    updApis: incoming.apis.filter((a) => curApi.has(a.id)).length,
    newCols: incoming.collections.filter((c) => !curCol.has(c.id)).length,
    updCols: incoming.collections.filter((c) => curCol.has(c.id)).length,
    incEnv: incoming.environments.length,
    incWs: incoming.wsScenarios.length,
  };
}
