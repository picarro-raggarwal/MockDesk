import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Link2, Play, Square, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/useAppStore";
import type { WsScenario } from "@/types/models";
import { GuideHint } from "@/components/GuideHint";

const companionWsBase =
  (import.meta.env.VITE_COMPANION_WS_ORIGIN as string | undefined)?.replace(/\/$/, "") ?? "ws://127.0.0.1:8787";

type LogLine = { at: string; payload: string; channel: "script" | "live" };

function integrationSnippet(url: string): string {
  return `const ws = new WebSocket("${url}");

ws.addEventListener("open", () => {
  console.log("connected");
});

ws.addEventListener("message", (event) => {
  try {
    console.log(JSON.parse(event.data));
  } catch {
    console.log(event.data);
  }
});

ws.addEventListener("close", (event) => {
  console.log("closed", event.code, event.reason);
});

ws.addEventListener("error", (err) => {
  console.error(err);
});`;
}

export function WsLabPage() {
  const wsScenarios = useAppStore((s) => s.wsScenarios);
  const addWsScenario = useAppStore((s) => s.addWsScenario);

  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [scriptLog, setScriptLog] = useState<LogLine[]>([]);
  const [liveLog, setLiveLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);

  const [liveWsUrl, setLiveWsUrl] = useState(`${companionWsBase}/ws/live`);
  const [liveStatus, setLiveStatus] = useState<"idle" | "connecting" | "open" | "closed" | "error">("idle");

  const scenario = useMemo(
    () => (scenarioId ? wsScenarios.find((w) => w.id === scenarioId) : undefined),
    [scenarioId, wsScenarios],
  );

  useEffect(() => {
    if (!scenario?.path) return;
    const p = scenario.path.startsWith("/") ? scenario.path : `/${scenario.path}`;
    setLiveWsUrl(`${companionWsBase}${p}`);
  }, [scenario?.id, scenario?.path]);

  const disconnectLive = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {
        /* ignore */
      }
      socketRef.current = null;
    }
    setLiveStatus("closed");
  }, []);

  useEffect(() => () => disconnectLive(), [disconnectLive]);

  const connectLive = useCallback(() => {
    disconnectLive();
    setLiveLog([]);
    setLiveStatus("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(liveWsUrl);
    } catch {
      setLiveStatus("error");
      return;
    }
    socketRef.current = ws;
    ws.onopen = () => {
      setLiveStatus("open");
    };
    ws.onmessage = (ev) => {
      const text = typeof ev.data === "string" ? ev.data : "[binary frame]";
      setLiveLog((prev) => [...prev, { at: new Date().toISOString(), payload: text, channel: "live" }]);
    };
    ws.onerror = () => {
      setLiveStatus("error");
    };
    ws.onclose = () => {
      socketRef.current = null;
      setLiveStatus((prev) => {
        if (prev === "error") return "error";
        if (prev === "connecting") return "error";
        return "closed";
      });
    };
  }, [disconnectLive, liveWsUrl]);

  const copySnippet = () => {
    void navigator.clipboard.writeText(integrationSnippet(liveWsUrl));
  };

  const copyCompanionCommand = () => {
    void navigator.clipboard.writeText("npm run companion -- ./mockdesk-export.json");
  };

  const runScript = async (w: WsScenario) => {
    cancelRef.current = false;
    setRunning(true);
    setScriptLog([]);
    for (const m of w.messages) {
      if (cancelRef.current) break;
      await new Promise((r) => setTimeout(r, m.delayMs));
      if (cancelRef.current) break;
      setScriptLog((prev) => [
        ...prev,
        { at: new Date().toISOString(), payload: m.payloadJson, channel: "script" },
      ]);
    }
    setRunning(false);
  };

  const stop = () => {
    cancelRef.current = true;
    setRunning(false);
  };

  const renderLog = (lines: LogLine[]) =>
    lines.length === 0 ? (
      <p className="text-sm text-muted-foreground">No messages yet.</p>
    ) : (
      <ul className="max-h-[min(420px,55vh)] space-y-3 overflow-y-auto font-mono text-xs">
        {lines.map((line, i) => (
          <li key={`${line.at}-${i}-${line.channel}`} className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase text-muted-foreground">
              <span>{line.at}</span>
              <span className="rounded bg-background px-1.5 py-0.5 normal-case">{line.channel}</span>
            </div>
            <pre className="whitespace-pre-wrap break-all">{line.payload}</pre>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start gap-2">
          <h1 className="text-3xl font-bold tracking-tight">WebSocket lab</h1>
          <GuideHint section="ws-lab" className="mt-1 shrink-0" />
        </div>
        <p className="mt-1 text-muted-foreground">
          Preview scenario scripts in the browser, or connect to the{" "}
          <strong className="font-medium text-foreground">MockDesk companion</strong> WebSocket server to stream the
          same payloads a production client would receive.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario</CardTitle>
          <CardDescription>
            Choose a scenario path that matches the companion URL path (export JSON must include{" "}
            <code className="rounded bg-muted px-1">wsScenarios</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label>Scenario</Label>
            <Select
              value={scenarioId ?? ""}
              onValueChange={(v) => {
                setScenarioId(v || null);
                setScriptLog([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={wsScenarios.length ? "Choose a scenario" : "No scenarios yet"} />
              </SelectTrigger>
              <SelectContent>
                {wsScenarios.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} — {w.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList className="flex w-full flex-wrap gap-1">
          <TabsTrigger value="preview">Script preview</TabsTrigger>
          <TabsTrigger value="live">Live stream (companion)</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-2 space-y-0">
              <div>
                <CardTitle>In-browser replay</CardTitle>
                <CardDescription>Runs the saved message list with delays only inside this tab.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={!scenario || running}
                  onClick={() => {
                    if (scenario) void runScript(scenario);
                  }}
                >
                  <Play className="h-4 w-4" />
                  Play script
                </Button>
                <Button type="button" variant="outline" disabled={!running} onClick={stop}>
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!scenario ? (
                <p className="text-sm text-muted-foreground">Select a scenario to preview.</p>
              ) : scriptLog.length === 0 && !running ? (
                <p className="text-sm text-muted-foreground">Press Play script to simulate messages locally.</p>
              ) : (
                renderLog(scriptLog)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connect to companion</CardTitle>
              <CardDescription>
                Run <code className="rounded bg-muted px-1">npm run companion -- ./your-export.json</code> (same
                machine). Companion serves WebSocket upgrades on the same port as HTTP (default{" "}
                <code className="rounded bg-muted px-1">8787</code>). Set{" "}
                <code className="rounded bg-muted px-1">VITE_COMPANION_WS_ORIGIN</code> in{" "}
                <code className="rounded bg-muted px-1">.env</code> if your server host differs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wsurl">WebSocket URL</Label>
                <Input
                  id="wsurl"
                  className="font-mono text-sm"
                  value={liveWsUrl}
                  onChange={(e) => setLiveWsUrl(e.target.value)}
                  placeholder="ws://127.0.0.1:8787/ws/notifications"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={connectLive} disabled={liveStatus === "connecting" || !liveWsUrl.trim()}>
                  <Link2 className="h-4 w-4" />
                  Connect
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={disconnectLive}
                  disabled={liveStatus !== "open" && liveStatus !== "connecting"}
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </Button>
                <Button type="button" variant="secondary" onClick={copySnippet}>
                  <Copy className="h-4 w-4" />
                  Copy client snippet
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={copyCompanionCommand}>
                  Copy companion command
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Status: <span className="font-medium text-foreground">{liveStatus}</span>
                {liveStatus === "error" && " — Is the companion running? Check URL and path."}
              </p>
              <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">Real app integration</p>
                <p>
                  Any WebSocket client (browser, mobile, backend) can connect to the same URL. The server sends an
                  initial <code className="rounded bg-muted px-0.5">mockdesk.open</code> frame, then each scenario
                  payload as text (usually JSON), then a <code className="rounded bg-muted px-0.5">mockdesk.eos</code>{" "}
                  frame when the script finishes. Set <code className="rounded bg-muted px-0.5">MOCKDESK_WS_LOOP=1</code>{" "}
                  on the companion to repeat the scenario until disconnect (good for soak tests).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live transcript</CardTitle>
              <CardDescription>Frames received from the network (including control messages).</CardDescription>
            </CardHeader>
            <CardContent>{renderLog(liveLog)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {wsScenarios.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No WebSocket scenarios</CardTitle>
            <CardDescription>Import a v1.1 JSON that includes wsScenarios, or add a demo to try the lab.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const w = addWsScenario("Demo stream", "/ws/live");
                setScenarioId(w.id);
              }}
            >
              Add demo scenario
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
