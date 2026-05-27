import {
  getCompanionApiBaseUrl,
  getCompanionHttpOrigin
} from "@/constants/companion";
import { newId, nowIso } from "@/lib/utils";
import { appendAudit } from "@/services/auditLog";
import {
  appExportSchema,
  type ParsedExport
} from "@/services/importExportSchema";
import type {
  AppEnvironment,
  Collection,
  MockApi,
  MockResponse,
  ThemeMode,
  WsScenario
} from "@/types/models";
import { ZodError } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const STORAGE_KEY = "mockdesk-storage";

function emptyPair() {
  return { id: newId(), key: "", value: "" };
}

function defaultResponse(): MockResponse {
  return {
    id: newId(),
    statusCode: 200,
    delayMs: 0,
    responseType: "success",
    bodyJson: '{\n  "message": "Hello from MockDesk"\n}'
  };
}

function defaultEnvironments(): AppEnvironment[] {
  const t = nowIso();
  return [
    {
      id: "env_demo_local",
      name: "Local",
      variables: [
        { id: newId(), key: "baseUrl", value: getCompanionHttpOrigin() },
        { id: newId(), key: "token", value: "dev.jwt.sample" },
        { id: newId(), key: "userId", value: "42" },
        { id: newId(), key: "featureFlag", value: "beta" },
        { id: newId(), key: "orderPrefix", value: "ORD-" },
        { id: newId(), key: "tenant", value: "demo" }
      ],
      createdAt: t,
      updatedAt: t
    },
    {
      id: "env_demo_staging",
      name: "Staging",
      variables: [
        { id: newId(), key: "baseUrl", value: "https://staging.example.com" },
        { id: newId(), key: "token", value: "staging.token" },
        { id: newId(), key: "userId", value: "9001" },
        { id: newId(), key: "featureFlag", value: "all-on" },
        { id: newId(), key: "orderPrefix", value: "STG-" }
      ],
      createdAt: t,
      updatedAt: t
    }
  ];
}

function sampleWsScenarios(): WsScenario[] {
  const t = nowIso();
  return [
    {
      id: "ws_sample_notifications",
      name: "Notification stream",
      description: "Simulated server-push style messages for the WS lab.",
      path: "/ws/notifications",
      messages: [
        {
          id: newId(),
          delayMs: 0,
          payloadJson: JSON.stringify(
            { event: "connected", channel: "notifications", tenant: "demo" },
            null,
            2
          )
        },
        {
          id: newId(),
          delayMs: 450,
          payloadJson: JSON.stringify(
            { event: "order.created", orderId: "ord_1001", amount: 49.99 },
            null,
            2
          )
        },
        {
          id: newId(),
          delayMs: 500,
          payloadJson: JSON.stringify(
            { event: "promo", message: "Free shipping until midnight" },
            null,
            2
          )
        }
      ],
      createdAt: t,
      updatedAt: t
    },
    {
      id: "ws_sample_live_counter",
      name: "Live counter",
      description: "Simple numeric ticker with staggered delays.",
      path: "/ws/live",
      messages: [
        {
          id: newId(),
          delayMs: 0,
          payloadJson: JSON.stringify({ count: 0, label: "start" }, null, 2)
        },
        {
          id: newId(),
          delayMs: 350,
          payloadJson: JSON.stringify({ count: 1 }, null, 2)
        },
        {
          id: newId(),
          delayMs: 350,
          payloadJson: JSON.stringify({ count: 2 }, null, 2)
        },
        {
          id: newId(),
          delayMs: 350,
          payloadJson: JSON.stringify({ count: 3, done: true }, null, 2)
        }
      ],
      createdAt: t,
      updatedAt: t
    }
  ];
}

function createBlankApi(collectionId: string | null): MockApi {
  const r = defaultResponse();
  const t = nowIso();
  return {
    id: newId(),
    collectionId,
    name: "New API",
    baseUrl: getCompanionApiBaseUrl(),
    path: "/example",
    pathVersionPrefix: "",
    method: "GET",
    description: "",
    tags: [],
    headers: [emptyPair()],
    queryParams: [emptyPair()],
    requestBodySchema: "",
    responses: [r],
    defaultResponseId: r.id,
    environmentId: null,
    createdAt: t,
    updatedAt: t
  };
}

function cloneApiForCollection(api: MockApi, newCollectionId: string): MockApi {
  const t = nowIso();
  const idMap = new Map<string, string>();
  for (const r of api.responses) idMap.set(r.id, newId());
  const responses = api.responses.map((r) => ({ ...r, id: idMap.get(r.id)! }));
  let newDef: string | null = null;
  if (api.defaultResponseId)
    newDef = idMap.get(api.defaultResponseId) ?? responses[0]?.id ?? null;
  else newDef = responses[0]?.id ?? null;
  return {
    ...api,
    id: newId(),
    collectionId: newCollectionId,
    name: `${api.name} (copy)`,
    responses,
    defaultResponseId: newDef,
    headers: api.headers.map((h) => ({ ...h, id: newId() })),
    queryParams: api.queryParams.map((h) => ({ ...h, id: newId() })),
    createdAt: t,
    updatedAt: t
  };
}

function zodIssues(e: ZodError) {
  return e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
}

function zodIssuesSafe(e: unknown) {
  return e instanceof ZodError ? zodIssues(e) : "Validation failed";
}

/** Older persisted state may omit pathVersionPrefix; runtime always uses a string. */
function normalizeApisForHydrate(apis: MockApi[]): MockApi[] {
  return apis.map((a) => ({
    ...a,
    pathVersionPrefix: a.pathVersionPrefix ?? "",
    environmentId: a.environmentId ?? null
  }));
}

export interface AppState {
  theme: ThemeMode;
  collections: Collection[];
  apis: MockApi[];
  environments: AppEnvironment[];
  currentEnvId: string | null;
  wsScenarios: WsScenario[];
  setTheme: (t: ThemeMode) => void;
  addCollection: (name: string, description?: string) => Collection;
  updateCollection: (
    id: string,
    patch: Partial<Pick<Collection, "name" | "description">>
  ) => void;
  deleteCollection: (id: string) => void;
  duplicateCollection: (id: string) => Collection | null;
  addApi: (collectionId?: string | null) => MockApi;
  updateApi: (id: string, patch: Partial<MockApi>) => void;
  deleteApi: (id: string) => void;
  duplicateApi: (id: string) => MockApi | null;
  clearAllApis: () => void;
  resetApp: () => void;
  importData: (
    data: unknown,
    mode: "merge" | "overwrite"
  ) => { ok: true } | { ok: false; error: string };
  seedDefaultsIfEmpty: () => void;
  addEnvironment: (name: string) => AppEnvironment;
  updateEnvironment: (
    id: string,
    patch: Partial<Pick<AppEnvironment, "name" | "variables">>
  ) => void;
  deleteEnvironment: (id: string) => void;
  setCurrentEnvId: (id: string | null) => void;
  addWsScenario: (name: string, path: string) => WsScenario;
  updateWsScenario: (
    id: string,
    patch: Partial<
      Pick<WsScenario, "name" | "description" | "path" | "messages">
    >
  ) => void;
  deleteWsScenario: (id: string) => void;
}

const initialState = {
  theme: "light" as ThemeMode,
  collections: [] as Collection[],
  apis: [] as MockApi[],
  environments: [] as AppEnvironment[],
  currentEnvId: null as string | null,
  wsScenarios: [] as WsScenario[]
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setTheme: (theme) => set({ theme: theme === "dark" ? "dark" : "light" }),
      addCollection: (name, description) => {
        const t = nowIso();
        const c: Collection = {
          id: newId(),
          name,
          description,
          createdAt: t,
          updatedAt: t
        };
        set((s) => ({ collections: [...s.collections, c] }));
        void appendAudit("collection", `Created "${name}"`);
        return c;
      },
      updateCollection: (id, patch) => {
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c
          )
        }));
      },
      deleteCollection: (id) => {
        set((s) => ({
          collections: s.collections.filter((c) => c.id !== id),
          apis: s.apis.map((a) =>
            a.collectionId === id
              ? { ...a, collectionId: null, updatedAt: nowIso() }
              : a
          )
        }));
        void appendAudit("collection", `Deleted collection ${id}`);
      },
      duplicateCollection: (id) => {
        const col = get().collections.find((c) => c.id === id);
        if (!col) return null;
        const t = nowIso();
        const newIdCol = newId();
        const newCol: Collection = {
          ...col,
          id: newIdCol,
          name: `${col.name} (copy)`,
          createdAt: t,
          updatedAt: t
        };
        const clones = get()
          .apis.filter((a) => a.collectionId === id)
          .map((a) => cloneApiForCollection(a, newIdCol));
        set((s) => ({
          collections: [...s.collections, newCol],
          apis: [...s.apis, ...clones]
        }));
        void appendAudit(
          "collection",
          `Duplicated collection "${col.name}" → ${clones.length} APIs`
        );
        return newCol;
      },
      addApi: (collectionId = null) => {
        const api = createBlankApi(collectionId ?? null);
        set((s) => ({ apis: [...s.apis, api] }));
        void appendAudit("api", `Created API "${api.name}"`);
        return api;
      },
      updateApi: (id, patch) => {
        set((s) => ({
          apis: s.apis.map((a) =>
            a.id === id ? { ...a, ...patch, id: a.id, updatedAt: nowIso() } : a
          )
        }));
      },
      deleteApi: (id) => {
        set((s) => ({ apis: s.apis.filter((a) => a.id !== id) }));
        void appendAudit("api", `Deleted API ${id}`);
      },
      duplicateApi: (id) => {
        const src = get().apis.find((a) => a.id === id);
        if (!src) return null;
        const t = nowIso();
        const idMap = new Map<string, string>();
        for (const r of src.responses) idMap.set(r.id, newId());
        const cloneResponses = src.responses.map((r) => ({
          ...r,
          id: idMap.get(r.id)!
        }));
        let newDef: string | null = null;
        if (src.defaultResponseId) {
          newDef =
            idMap.get(src.defaultResponseId) ?? cloneResponses[0]?.id ?? null;
        } else {
          newDef = cloneResponses[0]?.id ?? null;
        }
        const copy: MockApi = {
          ...src,
          id: newId(),
          name: `${src.name} (copy)`,
          responses: cloneResponses,
          defaultResponseId: newDef,
          headers: src.headers.map((h) => ({ ...h, id: newId() })),
          queryParams: src.queryParams.map((h) => ({ ...h, id: newId() })),
          createdAt: t,
          updatedAt: t
        };
        set((s) => ({ apis: [...s.apis, copy] }));
        void appendAudit("api", `Duplicated API "${src.name}"`);
        return copy;
      },
      clearAllApis: () => {
        set({ apis: [] });
        void appendAudit("app", "Cleared all APIs");
      },
      resetApp: () => {
        const envs = defaultEnvironments();
        set({
          apis: [],
          collections: [],
          theme: "light",
          environments: envs,
          currentEnvId: envs[0]?.id ?? null,
          wsScenarios: []
        });
        void appendAudit("app", "Full reset");
      },
      importData: (data, mode) => {
        const parsed = appExportSchema.safeParse(data);
        if (!parsed.success) {
          return { ok: false, error: zodIssuesSafe(parsed.error) };
        }
        const d = parsed.data;
        if (mode === "overwrite") {
          set({
            collections: d.collections,
            apis: d.apis,
            environments: d.environments.length
              ? d.environments
              : defaultEnvironments(),
            currentEnvId: d.currentEnvId ?? d.environments[0]?.id ?? null,
            wsScenarios: d.wsScenarios
          });
          void appendAudit("import", "Overwrite import");
          return { ok: true };
        }
        set((s) => {
          const colById = new Map(s.collections.map((c) => [c.id, c]));
          for (const c of d.collections) colById.set(c.id, c);
          const apiById = new Map(s.apis.map((a) => [a.id, a]));
          for (const a of d.apis) apiById.set(a.id, a);
          const envById = new Map(s.environments.map((e) => [e.id, e]));
          for (const e of d.environments) envById.set(e.id, e);
          const wsById = new Map(s.wsScenarios.map((w) => [w.id, w]));
          for (const w of d.wsScenarios) wsById.set(w.id, w);
          return {
            collections: [...colById.values()],
            apis: [...apiById.values()],
            environments: [...envById.values()],
            wsScenarios: [...wsById.values()],
            currentEnvId: d.currentEnvId ?? s.currentEnvId
          };
        });
        void appendAudit("import", "Merge import");
        return { ok: true };
      },
      seedDefaultsIfEmpty: () => {
        const { apis, collections, environments, wsScenarios } = get();
        if (apis.length > 0 || collections.length > 0) return;

        const patch: Partial<Pick<AppState, "environments" | "currentEnvId" | "wsScenarios">> = {};
        if (environments.length === 0) {
          const envs = defaultEnvironments();
          patch.environments = envs;
          patch.currentEnvId = get().currentEnvId ?? envs[0]?.id ?? null;
        }
        if (wsScenarios.length === 0) {
          patch.wsScenarios = sampleWsScenarios();
        }
        if (Object.keys(patch).length > 0) set(patch);
      },
      addEnvironment: (name) => {
        const t = nowIso();
        const e: AppEnvironment = {
          id: newId(),
          name,
          variables: [emptyPair()],
          createdAt: t,
          updatedAt: t
        };
        set((s) => ({ environments: [...s.environments, e] }));
        void appendAudit("env", `Created environment "${name}"`);
        return e;
      },
      updateEnvironment: (id, patch) => {
        set((s) => ({
          environments: s.environments.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: nowIso() } : e
          )
        }));
      },
      deleteEnvironment: (id) => {
        set((s) => {
          const nextEnvs = s.environments.filter((e) => e.id !== id);
          return {
            environments: nextEnvs,
            currentEnvId:
              s.currentEnvId === id ? (nextEnvs[0]?.id ?? null) : s.currentEnvId
          };
        });
        void appendAudit("env", `Deleted environment ${id}`);
      },
      setCurrentEnvId: (id) => set({ currentEnvId: id }),
      addWsScenario: (name, path) => {
        const t = nowIso();
        const w: WsScenario = {
          id: newId(),
          name,
          path: path || "/ws/channel",
          description: "",
          messages: [
            {
              id: newId(),
              delayMs: 0,
              payloadJson: JSON.stringify({ event: "hello", data: {} }, null, 2)
            }
          ],
          createdAt: t,
          updatedAt: t
        };
        set((s) => ({ wsScenarios: [...s.wsScenarios, w] }));
        void appendAudit("ws", `Created WS scenario "${name}"`);
        return w;
      },
      updateWsScenario: (id, patch) => {
        set((s) => ({
          wsScenarios: s.wsScenarios.map((w) =>
            w.id === id ? { ...w, ...patch, updatedAt: nowIso() } : w
          )
        }));
      },
      deleteWsScenario: (id) => {
        set((s) => ({ wsScenarios: s.wsScenarios.filter((w) => w.id !== id) }));
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        collections: s.collections,
        apis: s.apis,
        environments: s.environments,
        currentEnvId: s.currentEnvId,
        wsScenarios: s.wsScenarios
      }),
      merge: (persistedState, currentState) => {
        const p = persistedState as Partial<{
          theme: ThemeMode;
          collections: Collection[];
          apis: MockApi[];
          environments: AppEnvironment[];
          currentEnvId: string | null;
          wsScenarios: WsScenario[];
        }> | null;
        if (!p) return currentState;

        return {
          ...currentState,
          theme: p.theme ?? currentState.theme,
          collections: p.collections ?? currentState.collections,
          apis: normalizeApisForHydrate(p.apis ?? currentState.apis),
          environments: p.environments ?? currentState.environments,
          currentEnvId: p.currentEnvId ?? currentState.currentEnvId,
          wsScenarios: p.wsScenarios ?? currentState.wsScenarios
        };
      }
    }
  )
);

export function exportAppJson(
  state: Pick<AppState, "collections" | "apis" | "environments" | "currentEnvId" | "wsScenarios">,
  options?: { compact?: boolean },
): string {
  const payload = {
    version: "1.1" as const,
    exportedAt: nowIso(),
    collections: state.collections,
    apis: state.apis,
    environments: state.environments,
    currentEnvId: state.currentEnvId,
    wsScenarios: state.wsScenarios
  };
  return options?.compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
}

export function parseImportJson(
  text: string
): ParsedExport | { error: string } {
  try {
    const raw = JSON.parse(text) as unknown;
    const parsed = appExportSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: zodIssuesSafe(parsed.error) };
    }
    return parsed.data;
  } catch {
    return { error: "Invalid JSON file" };
  }
}

export function buildEnvVariableMap(
  environments: AppEnvironment[],
  currentEnvId: string | null
): Record<string, string> {
  const e = environments.find((x) => x.id === currentEnvId) ?? environments[0];
  if (!e) return {};
  const m: Record<string, string> = {};
  for (const { key, value } of e.variables) {
    const k = key.trim();
    if (k) m[k] = value;
  }
  return m;
}

export function getCurrentEnvMap(state: AppState): Record<string, string> {
  return buildEnvVariableMap(state.environments, state.currentEnvId);
}
