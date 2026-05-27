import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { Download, FileJson, Link2, Server, Upload } from "lucide-react";
import yaml from "js-yaml";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore, exportAppJson, parseImportJson } from "@/store/useAppStore";
import { importOpenApiToApis, exportApisToOpenApi } from "@/services/openapiImportExport";
import type { ParsedExport } from "@/services/importExportSchema";
import { Textarea } from "@/components/ui/textarea";
import { getCompanionApiBaseUrl, getCompanionHttpOrigin } from "@/constants/companion";

function summarizeMerge(current: ReturnType<typeof useAppStore.getState>, incoming: ParsedExport) {
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

export function ImportExportPage() {
  const collections = useAppStore((s) => s.collections);
  const apis = useAppStore((s) => s.apis);
  const environments = useAppStore((s) => s.environments);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const wsScenarios = useAppStore((s) => s.wsScenarios);
  const importData = useAppStore((s) => s.importData);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingMerge, setPendingMerge] = useState<ParsedExport | null>(null);
  const [oasText, setOasText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const oasRef = useRef<HTMLInputElement>(null);

  const snapshot = useMemo(
    () => ({ collections, apis, environments, currentEnvId, wsScenarios }),
    [collections, apis, environments, currentEnvId, wsScenarios],
  );

  const mergeStats = pendingMerge ? summarizeMerge(useAppStore.getState(), pendingMerge) : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const enc = params.get("share");
    if (!enc) return;
    try {
      const json = decompressFromEncodedURIComponent(enc);
      if (json) {
        setPaste(json);
        setMsg("Loaded from share link — review JSON, then Merge or Overwrite.");
        const u = new URL(window.location.href);
        u.searchParams.delete("share");
        window.history.replaceState({}, "", u.toString());
      }
    } catch {
      setMsg("Could not decode share link.");
    }
  }, []);

  const download = (filename: string, text: string) => {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = (text: string, mode: "merge" | "overwrite", skipConfirm?: boolean) => {
    const parsed = parseImportJson(text);
    if ("error" in parsed) {
      setMsg(parsed.error);
      return;
    }
    if (mode === "merge" && !skipConfirm) {
      setPendingMerge(parsed);
      return;
    }
    const res = importData(parsed, mode);
    setPendingMerge(null);
    if (!res.ok) setMsg(res.error);
    else setMsg(mode === "overwrite" ? "Import complete (replaced all data)." : "Import complete (merged by ID).");
  };

  const shareLink = () => {
    try {
      const raw = exportAppJson(snapshot);
      if (raw.length > 50_000) {
        setMsg("Workspace too large for a URL. Export a file instead.");
        return;
      }
      const enc = compressToEncodedURIComponent(raw);
      const url = `${window.location.origin}/import-export?share=${enc}`;
      void navigator.clipboard.writeText(url);
      setMsg("Share link copied to clipboard.");
    } catch {
      setMsg("Could not build share link.");
    }
  };

  const applyOas = (collectionId: string | null) => {
    let doc: unknown;
    try {
      doc = oasText.trim().startsWith("{") ? JSON.parse(oasText) : yaml.load(oasText);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Invalid OpenAPI");
      return;
    }
    const created = importOpenApiToApis(doc, collectionId);
    if (!created.length) {
      setMsg("No operations found.");
      return;
    }
    const res = importData(
      {
        version: "1.1",
        collections: [],
        apis: created,
        environments: [],
        currentEnvId: null,
        wsScenarios: [],
      },
      "merge",
    );
    setMsg(res.ok ? `Imported ${created.length} endpoints from OpenAPI.` : res.error);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import / Export</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          Move your workspace between browsers, teammates, and CI. Use <strong className="font-medium text-foreground">JSON v1.1</strong> for a full round-trip, <strong className="font-medium text-foreground">OpenAPI</strong> to bring in specs, or a <strong className="font-medium text-foreground">share link</strong> for quick handoffs. Stable IDs make merges predictable.
        </p>
      </div>

      <Tabs defaultValue="export">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="openapi">OpenAPI</TabsTrigger>
        </TabsList>

        {msg ? (
          <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
            {msg}
          </p>
        ) : null}

        <TabsContent value="export" className="space-y-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader>
                <CardTitle>Export JSON</CardTitle>
                <CardDescription>
                  Download everything MockDesk stores locally: collections, APIs, environments, active env id, and WS
                  lab scenarios (format version <code className="rounded bg-muted px-1">1.1</code>).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button variant="outline" onClick={() => download("mockdesk-app.json", exportAppJson(snapshot))}>
                    <FileJson className="h-4 w-4" />
                    Full app backup
                  </Button>
                  <Button type="button" variant="outline" onClick={shareLink}>
                    <Link2 className="h-4 w-4" />
                    Copy share link
                  </Button>
                  <Button
                    variant="outline"
                    disabled={collections.length === 0}
                    onClick={() => {
                      const first = collections[0];
                      if (!first) return;
                      const subset = {
                        version: "1.1" as const,
                        collections: [first],
                        apis: apis.filter((a) => a.collectionId === first.id),
                        environments: [] as typeof environments,
                        currentEnvId: null,
                        wsScenarios: [] as typeof wsScenarios,
                      };
                      download(`mockdesk-collection-${first.name.replace(/\s+/g, "-").toLowerCase()}.json`, JSON.stringify(subset, null, 2));
                    }}
                  >
                    <Download className="h-4 w-4" />
                    First collection
                  </Button>
                  <Button
                    variant="outline"
                    disabled={apis.length === 0}
                    onClick={() => {
                      const first = apis[0];
                      if (!first) return;
                      const subset = {
                        version: "1.1" as const,
                        collections: [] as typeof collections,
                        apis: [first],
                        environments: [] as typeof environments,
                        currentEnvId: null,
                        wsScenarios: [] as typeof wsScenarios,
                      };
                      download(`mockdesk-api-${first.name.replace(/\s+/g, "-").toLowerCase()}.json`, JSON.stringify(subset, null, 2));
                    }}
                  >
                    <Download className="h-4 w-4" />
                    First API only
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={apis.length === 0}
                    onClick={() => download("mockdesk-openapi.json", JSON.stringify(exportApisToOpenApi(apis), null, 2))}
                  >
                    Export OpenAPI (all APIs)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share links compress JSON into the URL — they work best for smaller workspaces (under ~50k characters
                  of JSON). Use a file export for large projects.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 shrink-0" />
                  Serve mocks over HTTP (Node)
                </CardTitle>
                <CardDescription>
                  The in-browser app does not answer real HTTP requests. Run the{" "}
                  <strong className="font-medium text-foreground">live gateway</strong> (UI pushes changes) or the{" "}
                  <strong className="font-medium text-foreground">file-based companion</strong> (static JSON) so tests,
                  mobile apps, Postman, or any other client can call your mocks on a real port.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                  <li>
                    Start a server from this repo:{" "}
                    <code className="rounded bg-muted px-1">npm run live-mock</code> (recommended — dev UI syncs
                    automatically) or <code className="rounded bg-muted px-1">npm run companion -- ./mockdesk-app.json</code>{" "}
                    (uses an export file; restart after each export). Default port{" "}
                    <code className="rounded bg-muted px-1">8787</code> (
                    <code className="rounded bg-muted px-1">PORT=9999</code> to change). Do not run both processes on
                    the same port.
                  </li>
                  <li>
                    With <code className="rounded bg-muted px-1">live-mock</code>, keep{" "}
                    <code className="rounded bg-muted px-1">npm run dev</code> running so edits push to the gateway
                    (debounced). Until the first sync, the repo ships a small default fixture at{" "}
                    <code className="rounded bg-muted px-1">fixtures/mockdesk-wms-smoke.json</code>.
                  </li>
                  <li>
                    Point any HTTP client at the same <strong className="font-medium text-foreground">origin + path</strong>{" "}
                    as your mock APIs (shown in the editor). Typical REST base:{" "}
                    <code className="rounded bg-muted px-1 font-mono text-xs">{getCompanionApiBaseUrl()}</code> — must
                    match each API&apos;s base URL pathname and path segments.
                  </li>
                </ol>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      void navigator.clipboard.writeText("npm run live-mock");
                      setMsg("Copied: npm run live-mock");
                    }}
                  >
                    Copy live-mock
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText("npm run companion");
                      setMsg("Copied: npm run companion");
                    }}
                  >
                    Copy companion
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(getCompanionApiBaseUrl());
                      setMsg("Copied mock API base URL.");
                    }}
                  >
                    Copy API base URL
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const curl = `curl -sS "${getCompanionHttpOrigin()}/api/health"`;
                      void navigator.clipboard.writeText(curl);
                      setMsg("Copied example curl (GET /api/health — needs gateway + default fixture or synced APIs).");
                    }}
                  >
                    Copy example curl
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Browser clients on another origin: CORS is enabled on the gateway. Optional{" "}
                  <code className="rounded bg-muted px-1">MOCKDESK_CORS_ORIGIN</code> for a fixed allow-list. Tune URLs
                  with <code className="rounded bg-muted px-1">VITE_COMPANION_HTTP_ORIGIN</code> and{" "}
                  <code className="rounded bg-muted px-1">VITE_LIVE_MOCK_SYNC_URL</code> in{" "}
                  <code className="rounded bg-muted px-1">.env</code> — see <code className="rounded bg-muted px-1">.env.example</code> and{" "}
                  <code className="rounded bg-muted px-1">docs/external-http-mocks.md</code>.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import JSON</CardTitle>
              <CardDescription>
                Paste v1.1 JSON or pick a file. Merge keeps your current IDs and overlays incoming records; overwrite replaces the whole workspace. Invalid JSON is rejected before your data changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Choose file</Label>
                <input
                  id="file"
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="block w-full text-sm"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const text = await f.text();
                    setPaste(text);
                    setMsg(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paste">Or paste JSON</Label>
                <Textarea id="paste" rows={8} value={paste} onChange={(e) => setPaste(e.target.value)} className="font-mono text-xs" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setMsg(null);
                    runImport(paste, "merge");
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Merge by ID
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setMsg(null);
                    runImport(paste, "overwrite", true);
                  }}
                >
                  Overwrite all
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="openapi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OpenAPI 3 import</CardTitle>
              <CardDescription>
                Paste OpenAPI 3 YAML or JSON, or load a file. Operations become new APIs merged into your workspace (existing IDs are untouched unless you import JSON separately).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={oasRef}
                type="file"
                accept=".yaml,.yml,.json,application/json"
                className="text-sm"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setOasText(await f.text());
                }}
              />
              <Textarea
                rows={10}
                value={oasText}
                onChange={(e) => setOasText(e.target.value)}
                placeholder="openapi: 3.0.0"
                className="font-mono text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => applyOas(null)}>
                  Import (uncategorized)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!collections[0]}
                  onClick={() => applyOas(collections[0]?.id ?? null)}
                >
                  Import into first collection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={pendingMerge !== null} onOpenChange={(o) => !o && setPendingMerge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm merge</DialogTitle>
            <DialogDescription>
              {mergeStats && (
                <ul className="mt-2 list-inside list-disc text-sm">
                  <li>New APIs: {mergeStats.newApis}</li>
                  <li>Updated APIs (same ID): {mergeStats.updApis}</li>
                  <li>New collections: {mergeStats.newCols}</li>
                  <li>Updated collections: {mergeStats.updCols}</li>
                  <li>Incoming environments: {mergeStats.incEnv}</li>
                  <li>Incoming WS scenarios: {mergeStats.incWs}</li>
                </ul>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPendingMerge(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pendingMerge) return;
                const res = importData(pendingMerge, "merge");
                setPendingMerge(null);
                setMsg(res.ok ? "Import complete (merged by ID)." : res.error);
              }}
            >
              Apply merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
