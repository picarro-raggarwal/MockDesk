import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileJson, Link2, Server, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareLinkReviewDialog } from "@/components/ShareLinkReviewDialog";
import { ShareStagedBanner } from "@/components/ShareStagedBanner";
import { useAppStore, exportAppJson, parseImportJson } from "@/store/useAppStore";
import type { ParsedExport } from "@/services/importExportSchema";
import {
  buildCollectionExport,
  collectionExportBasename,
  isCollectionScopedExport,
  remapCollectionPackageToNewIds,
  stringifyCollectionExport,
  stringifyCollectionExportCompact,
} from "@/services/collectionImportExport";
import { summarizeMerge } from "@/services/importExportMerge";
import { buildShareImportUrl } from "@/services/shareLinkImport";
import { useShareImport } from "@/hooks/useShareImport";
import { Textarea } from "@/components/ui/textarea";
import { getCompanionApiBaseUrl, getCompanionHttpOrigin } from "@/constants/companion";
import { GuideHint } from "@/components/GuideHint";

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
  const [importExportTab, setImportExportTab] = useState("export");
  const [exportCollectionId, setExportCollectionId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    shareStaged,
    shareReviewOpen,
    shareIncoming,
    importBody,
    showShareBanner,
    discardShare,
    clearShareAfterImport,
    handleReviewOpenChange,
    cancelShareReview,
    continueShareReview,
  } = useShareImport({ paste, setPaste, setMsg, setImportExportTab });

  const snapshot = useMemo(
    () => ({ collections, apis, environments, currentEnvId, wsScenarios }),
    [collections, apis, environments, currentEnvId, wsScenarios],
  );

  const mergeStats = pendingMerge ? summarizeMerge(useAppStore.getState(), pendingMerge) : null;

  useEffect(() => {
    if (collections.length === 0) {
      setExportCollectionId("");
      return;
    }
    setExportCollectionId((prev) => (prev && collections.some((c) => c.id === prev) ? prev : collections[0]!.id));
  }, [collections]);

  const download = (filename: string, text: string) => {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyShareLink = (raw: string, successMsg: string) => {
    const built = buildShareImportUrl(window.location.origin, raw);
    if (typeof built !== "string") {
      setMsg("Export too large for a URL. Use Download JSON instead.");
      return;
    }
    void navigator.clipboard.writeText(built);
    setMsg(successMsg);
  };

  const onImportSuccess = (message: string) => {
    clearShareAfterImport();
    setMsg(message);
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
    else onImportSuccess(mode === "overwrite" ? "Import complete (replaced all data)." : "Import complete (merged by ID).");
  };

  const runImportAsNewCollection = (body: string) => {
    setMsg(null);
    const parsed = parseImportJson(body);
    if ("error" in parsed) {
      setMsg(parsed.error);
      return;
    }
    if (!isCollectionScopedExport(parsed)) {
      setMsg("Needs one collection in JSON; each API must belong to it (or collectionId null).");
      return;
    }
    const remapped = remapCollectionPackageToNewIds(parsed);
    if (!remapped) {
      setMsg("Could not remap collection import.");
      return;
    }
    const res = importData(remapped, "merge");
    if (res.ok) {
      onImportSuccess(
        `Imported as new collection "${remapped.collections[0]?.name ?? "Untitled"}" (${remapped.apis.length} API(s), ${remapped.environments.length} environment(s)).`,
      );
    } else setMsg(res.error);
  };

  const copyShareLinkFullWorkspace = () => {
    try {
      const raw = exportAppJson(snapshot, { compact: true });
      copyShareLink(raw, "Share link copied (full workspace).");
    } catch {
      setMsg("Could not build share link.");
    }
  };

  const copyShareLinkCollection = () => {
    if (!exportCollectionId) {
      setMsg("Choose a collection first.");
      return;
    }
    try {
      const slice = buildCollectionExport({ collections, apis, environments }, exportCollectionId);
      if (!slice) {
        setMsg("Collection not found.");
        return;
      }
      const raw = stringifyCollectionExportCompact(slice);
      const name = slice.collections[0]?.name ?? "collection";
      copyShareLink(raw, `Share link copied for collection "${name}".`);
    } catch {
      setMsg("Could not build share link.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Import / Export</h1>
          <GuideHint section="import-export-share" className="mt-1 shrink-0" />
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          JSON v1.1 backup, collection slices, and share links. Details live in the README and{" "}
          <code className="rounded bg-muted px-1 text-xs">docs/external-http-mocks.md</code>.
        </p>
      </div>

      <Tabs value={importExportTab} onValueChange={setImportExportTab}>
        <TabsList className="flex h-auto w-full gap-1 rounded-lg bg-muted p-1 text-muted-foreground sm:h-10">
          <TabsTrigger value="export" className="flex-1">
            Export
          </TabsTrigger>
          <TabsTrigger value="import" className="flex-1">
            Import
          </TabsTrigger>
        </TabsList>

        {msg ? (
          <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
            {msg}
          </p>
        ) : null}

        <TabsContent value="export" className="space-y-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0 space-y-1">
                  <CardTitle>Export JSON</CardTitle>
                  <CardDescription>Full workspace (v1.1) or one collection. Share links suit small exports.</CardDescription>
                </div>
                <GuideHint section="companion-server" className="shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button variant="outline" onClick={() => download("mockdesk-app.json", exportAppJson(snapshot))}>
                    <FileJson className="h-4 w-4" />
                    Full app backup
                  </Button>
                  <Button type="button" variant="outline" onClick={copyShareLinkFullWorkspace}>
                    <Link2 className="h-4 w-4" />
                    Copy share link (full workspace)
                  </Button>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Collection export</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                      <Select
                        value={exportCollectionId || undefined}
                        onValueChange={setExportCollectionId}
                        disabled={collections.length === 0}
                      >
                        <SelectTrigger className="w-full sm:w-[280px]">
                          <SelectValue placeholder="Choose a collection" />
                        </SelectTrigger>
                        <SelectContent>
                          {collections.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!exportCollectionId}
                        onClick={() => {
                          const slice = buildCollectionExport(
                            { collections, apis, environments },
                            exportCollectionId,
                          );
                          if (!slice) {
                            setMsg("Collection not found.");
                            return;
                          }
                          const col = slice.collections[0];
                          const base = collectionExportBasename(col?.name ?? "collection");
                          download(`mockdesk-collection-${base}.json`, stringifyCollectionExport(slice));
                          setMsg(
                            `Exported collection "${col?.name}" with ${slice.apis.length} API(s) and ${slice.environments.length} referenced environment(s).`,
                          );
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Download JSON
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!exportCollectionId}
                        onClick={copyShareLinkCollection}
                      >
                        <Link2 className="h-4 w-4" />
                        Copy share link
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-left">
                  <Server className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1">Serve mocks over HTTP (Node)</span>
                  <GuideHint section="live-mock-gateway" className="-mr-1 shrink-0 sm:ml-auto" />
                </CardTitle>
                <CardDescription>
                  Run <code className="rounded bg-muted px-1 text-xs">npm run live-mock</code> or{" "}
                  <code className="rounded bg-muted px-1 text-xs">npm run companion</code> so real clients can hit your mocks (see README).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <code className="rounded bg-muted px-1 text-xs">live-mock</code>: dev UI syncs to the gateway; default{" "}
                    <code className="rounded bg-muted px-1 text-xs">8787</code>.
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 text-xs">companion</code>: serves an export file; restart after changes.
                  </li>
                  <li>
                    Client base URL should match your API paths (e.g.{" "}
                    <code className="rounded bg-muted px-1 font-mono text-xs">{getCompanionApiBaseUrl()}</code>).
                  </li>
                </ul>
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
                      setMsg("Copied example curl.");
                    }}
                  >
                    Copy example curl
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import JSON</CardTitle>
              <CardDescription>
                Merge by ID, overwrite all, or import as a new collection (single-collection JSON, new IDs).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showShareBanner && shareIncoming ? (
                <ShareStagedBanner counts={shareIncoming} onDiscard={discardShare} />
              ) : null}
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
                    discardShare();
                    setPaste(await f.text());
                    setMsg(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paste">Or paste JSON</Label>
                <Textarea
                  id="paste"
                  rows={8}
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setMsg(null);
                    runImport(importBody, "merge");
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Merge by ID
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    runImportAsNewCollection(importBody);
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Import as new collection
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setMsg(null);
                    runImport(importBody, "overwrite", true);
                  }}
                >
                  Overwrite all
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {shareStaged ? (
        <ShareLinkReviewDialog
          open={shareReviewOpen}
          staged={shareStaged}
          onOpenChange={handleReviewOpenChange}
          onCancel={cancelShareReview}
          onContinue={continueShareReview}
        />
      ) : null}

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
                if (res.ok) onImportSuccess("Import complete (merged by ID).");
                else setMsg(res.error);
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
