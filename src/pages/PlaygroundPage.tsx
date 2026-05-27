import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore, buildEnvVariableMap } from "@/store/useAppStore";
import { buildRequestContext, executeMockWithDelay, matchMockRequest } from "@/services/mockEngine";
import type { HttpMethod } from "@/types/models";
import { displayApiPath } from "@/utils/pathJoin";
import { Textarea } from "@/components/ui/textarea";

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function PlaygroundPage() {
  const apis = useAppStore((s) => s.apis);
  const [searchParams] = useSearchParams();
  const pathFromUrl = searchParams.get("path") ?? "";
  const methodFromUrl = searchParams.get("method") ?? "";

  const [path, setPath] = useState(() => pathFromUrl || "/api/users");
  const [method, setMethod] = useState<HttpMethod>(() => {
    const m = methodFromUrl as HttpMethod;
    return methods.includes(m) ? m : "GET";
  });

  useEffect(() => {
    setPath(pathFromUrl || "/api/users");
    const m = methodFromUrl as HttpMethod;
    setMethod(methods.includes(m) ? m : "GET");
  }, [pathFromUrl, methodFromUrl]);
  const [reqHeadersJson, setReqHeadersJson] = useState("{}");
  const [reqBody, setReqBody] = useState("");
  const [loading, setLoading] = useState(false);

  const environments = useAppStore((s) => s.environments);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const envMap = useMemo(
    () => buildEnvVariableMap(environments, currentEnvId),
    [environments, currentEnvId],
  );
  const [result, setResult] = useState<{
    status: number;
    ms: number;
    body: string;
    headers: Record<string, string>;
  } | null>(null);

  const sampleHint = useMemo(() => {
    const g = apis.find((a) => a.method === "GET");
    if (!g) return "/api/example";
    return displayApiPath(g);
  }, [apis]);

  const send = async () => {
    setLoading(true);
    setResult(null);
    const t0 = performance.now();
    let extra: Record<string, string> = {};
    try {
      extra = JSON.parse(reqHeadersJson || "{}") as Record<string, string>;
    } catch {
      extra = {};
    }
    const ctx = buildRequestContext(path, extra, reqBody);
    const raw = matchMockRequest(method, path, apis, ctx, envMap, environments);
    const final = await executeMockWithDelay(raw);
    const ms = Math.round(performance.now() - t0);
    if ("api" in final) {
      setResult({
        status: final.statusCode,
        ms,
        body: JSON.stringify(final.body, null, 2),
        headers: final.headers,
      });
    } else {
      setResult({
        status: final.statusCode,
        ms,
        body: JSON.stringify(final.body, null, 2),
        headers: { "content-type": "application/json" },
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
        <p className="mt-1 text-muted-foreground">Postman-lite: send a request against the in-browser mock engine.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
          <CardDescription>
            Match: pathname + method + optional conditional rules. Headers/body feed matchers. Templates use current
            environment (Settings). Example path: {sampleHint}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2 sm:w-40">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="path">Path or full URL (query string is parsed)</Label>
              <Input id="path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/users" className="font-mono text-sm" />
            </div>
            <Button type="button" onClick={send} disabled={loading} className="sm:mb-0.5">
              <Send className="h-4 w-4" />
              {loading ? "Sending…" : "Send"}
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Request headers (JSON object)</Label>
              <Textarea
                rows={4}
                className="font-mono text-xs"
                value={reqHeadersJson}
                onChange={(e) => setReqHeadersJson(e.target.value)}
                placeholder='{"Authorization":"Bearer invalid"}'
              />
            </div>
            <div className="space-y-2">
              <Label>Request body (for POST matchers / bodyContains)</Label>
              <Textarea rows={4} className="font-mono text-xs" value={reqBody} onChange={(e) => setReqBody(e.target.value)} placeholder="{}" />
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>Response</CardTitle>
              <CardDescription>
                Status {result.status} · {result.ms} ms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="body">
                <TabsList>
                  <TabsTrigger value="body">Body</TabsTrigger>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                </TabsList>
                <TabsContent value="body" className="mt-3 min-w-0">
                  <pre className="max-h-[min(420px,70vh)] max-w-full overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-3 font-mono text-xs sm:p-4">
                    {result.body}
                  </pre>
                </TabsContent>
                <TabsContent value="headers" className="mt-3 min-w-0">
                  <pre className="max-h-[min(420px,70vh)] max-w-full overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-3 font-mono text-xs sm:p-4">
                    {JSON.stringify(result.headers, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
