import { useState } from "react";
import { motion } from "framer-motion";
import { HardDrive, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAppStore, exportAppJson, parseImportJson } from "@/store/useAppStore";
import { APP_VERSION } from "@/constants/version";
import { estimateLocalStorageBytes, formatBytes } from "@/utils/storageUsage";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GuideHint } from "@/components/GuideHint";

export function SettingsPage() {
  const collections = useAppStore((s) => s.collections);
  const apis = useAppStore((s) => s.apis);
  const environments = useAppStore((s) => s.environments);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const wsScenarios = useAppStore((s) => s.wsScenarios);
  const clearAllApis = useAppStore((s) => s.clearAllApis);
  const resetApp = useAppStore((s) => s.resetApp);
  const importData = useAppStore((s) => s.importData);
  const [backup, setBackup] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const usage = formatBytes(estimateLocalStorageBytes());

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <GuideHint section="import-export-share" className="mt-1 shrink-0" />
        </div>
        <p className="mt-1 text-muted-foreground">
          Theme: use <strong className="font-medium text-foreground">Appearance</strong> in the sidebar footer (or the
          compact control in the header on narrow screens).
        </p>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card>
          <CardHeader>
            <CardTitle>App</CardTitle>
            <CardDescription>Version and approximate local storage for MockDesk data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span>
                Storage (approx.): <strong>{usage}</strong>
              </span>
            </div>
            <p className="text-muted-foreground">App version: {APP_VERSION}</p>
          </CardContent>
        </Card>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
          <CardDescription>Download or restore the same JSON format as Import / Export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={() =>
              download(
                "mockdesk-backup.json",
                exportAppJson({ collections, apis, environments, currentEnvId, wsScenarios }),
              )
            }
          >
            Export backup
          </Button>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="restore">Paste backup JSON to restore</Label>
            <Textarea id="restore" rows={6} value={backup} onChange={(e) => setBackup(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setNote(null);
                const p = parseImportJson(backup);
                if ("error" in p) {
                  setNote(p.error);
                  return;
                }
                const r = importData(p, "overwrite");
                setNote(r.ok ? "Restored from backup." : r.error);
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Import backup (overwrite)
            </Button>
          </div>
          {note && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note}</p>}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Clearing storage cannot be undone. Export first if you need a copy.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline">
                <Trash2 className="h-4 w-4" />
                Clear all APIs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all APIs?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes every mock API. Collections, environments, and WebSocket scenarios stay unchanged. It
                  cannot be undone — export a backup first if you need a copy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button type="button" variant="destructive" onClick={() => clearAllApis()}>
                    Clear all APIs
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                Reset app
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset entire app?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears all APIs, collections, and WebSocket scenarios, sets theme to light, and restores default
                  environments. It cannot be undone. Export a backup first if you need a copy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button type="button" variant="destructive" onClick={() => resetApp()}>
                    Reset app
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
