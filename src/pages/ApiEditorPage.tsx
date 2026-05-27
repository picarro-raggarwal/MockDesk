import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { JsonEditor } from "@/features/apis/JsonEditor";
import { useAppStore, buildEnvVariableMap } from "@/store/useAppStore";
import { substituteTemplates } from "@/services/substitution";
import type { HttpMethod, KeyValuePair, MockApi, MockResponse, MockResponseType, ResponseMatchWhen } from "@/types/models";
import { newId } from "@/lib/utils";
import { displayApiPath, displayApiPathWithQuery } from "@/utils/pathJoin";
import { formatJsonString, tryParseJson } from "@/utils/json";
import { getCompanionApiBaseUrl } from "@/constants/companion";
import { GuideHint } from "@/components/GuideHint";

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  baseUrl: z.string().min(1, "Base URL is required"),
  path: z.string(),
  pathVersionPrefix: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  description: z.string().optional(),
  tagsInput: z.string().optional(),
  collectionId: z.string().nullable(),
  environmentId: z.string().nullable(),
  requestBodySchema: z.string().optional(),
});

type BaseForm = z.infer<typeof baseSchema>;

function pairsFromForm(rows: KeyValuePair[]): KeyValuePair[] {
  return rows.length ? rows : [{ id: newId(), key: "", value: "" }];
}

const STATUS_PRESETS = [200, 201, 400, 401, 403, 404, 500] as const;

function tagsFromInput(tagsInput: string | undefined): string[] {
  const t = tagsInput
    ? tagsInput
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  return t.slice().sort();
}

function normalizePairsForCompare(rows: KeyValuePair[]) {
  return rows
    .filter((h) => h.key.trim() || h.value.trim())
    .map((h) => [h.key.trim(), h.value.trim()] as const)
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
}

function normalizeResponsesForCompare(list: MockResponse[]) {
  return list.map((r) => ({
    id: r.id,
    statusCode: r.statusCode,
    delayMs: r.delayMs,
    responseType: r.responseType,
    bodyJson: r.bodyJson,
    name: r.name ?? "",
    matchWhen: r.matchWhen ?? null,
  }));
}

function serializeEditorState(
  apiId: string,
  formVals: Partial<BaseForm> | BaseForm,
  headers: KeyValuePair[],
  queryParams: KeyValuePair[],
  responses: MockResponse[],
  defaultResponseId: string | null,
): string | null {
  const parsed = baseSchema.safeParse(formVals);
  if (!parsed.success) return null;
  const d = parsed.data;
  return JSON.stringify({
    id: apiId,
    name: d.name,
    baseUrl: d.baseUrl,
    path: d.path,
    pathVersionPrefix: d.pathVersionPrefix ?? "",
    method: d.method,
    description: d.description || "",
    collectionId: d.collectionId,
    environmentId: d.environmentId ?? null,
    requestBodySchema: d.requestBodySchema || "",
    tags: tagsFromInput(d.tagsInput),
    headers: normalizePairsForCompare(headers),
    queryParams: normalizePairsForCompare(queryParams),
    responses: normalizeResponsesForCompare(responses),
    defaultResponseId,
  });
}

function serializeStoredApi(api: MockApi): string {
  const formVals: BaseForm = {
    name: api.name,
    baseUrl: api.baseUrl,
    path: api.path,
    pathVersionPrefix: api.pathVersionPrefix ?? "",
    method: api.method,
    description: api.description ?? "",
    tagsInput: api.tags.join(", "),
    collectionId: api.collectionId,
    environmentId: api.environmentId ?? null,
    requestBodySchema: api.requestBodySchema ?? "",
  };
  return serializeEditorState(api.id, formVals, api.headers, api.queryParams, api.responses, api.defaultResponseId)!;
}

function makeDefaultResponse(): MockResponse {
  const r: MockResponse = {
    id: newId(),
    statusCode: 200,
    delayMs: 0,
    responseType: "success",
    bodyJson: '{\n  "message": "Hello from MockDesk"\n}',
  };
  return r;
}

export function ApiEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apis = useAppStore((s) => s.apis);
  const collections = useAppStore((s) => s.collections);
  const environments = useAppStore((s) => s.environments);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const addApi = useAppStore((s) => s.addApi);
  const updateApi = useAppStore((s) => s.updateApi);
  const duplicateApi = useAppStore((s) => s.duplicateApi);

  const isNew = id === "new";
  const api = useMemo(() => (isNew ? undefined : apis.find((a) => a.id === id)), [apis, id, isNew]);

  const defaultR = useRef(makeDefaultResponse());

  const [responses, setResponses] = useState<MockResponse[]>(() => [defaultR.current]);
  const [defaultResponseId, setDefaultResponseId] = useState<string | null>(() => defaultR.current.id);
  const [headers, setHeaders] = useState<KeyValuePair[]>(() => [{ id: newId(), key: "", value: "" }]);
  const [queryParams, setQueryParams] = useState<KeyValuePair[]>(() => [{ id: newId(), key: "", value: "" }]);
  const [statusMode, setStatusMode] = useState<Record<string, "preset" | "custom">>(() => ({
    [defaultR.current.id]: "preset",
  }));

  const form = useForm<BaseForm>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      name: "",
      baseUrl: getCompanionApiBaseUrl(),
      path: "/",
      pathVersionPrefix: "",
      method: "GET",
      description: "",
      tagsInput: "",
      collectionId: null,
      environmentId: null,
      requestBodySchema: "",
    },
  });

  const prevEditorIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (isNew || !id) return;
    const a = useAppStore.getState().apis.find((x) => x.id === id);
    if (!a) return;
    if (prevEditorIdRef.current === id) return;
    prevEditorIdRef.current = id;

    form.reset({
      name: a.name,
      baseUrl: a.baseUrl,
      path: a.path,
      pathVersionPrefix: a.pathVersionPrefix ?? "",
      method: a.method,
      description: a.description ?? "",
      tagsInput: a.tags.join(", "),
      collectionId: a.collectionId,
      environmentId: a.environmentId ?? null,
      requestBodySchema: a.requestBodySchema ?? "",
    });
    setResponses(a.responses);
    setDefaultResponseId(a.defaultResponseId);
    setHeaders(pairsFromForm(a.headers));
    setQueryParams(pairsFromForm(a.queryParams));
    const sm: Record<string, "preset" | "custom"> = {};
    for (const r of a.responses) {
      sm[r.id] = STATUS_PRESETS.includes(r.statusCode as (typeof STATUS_PRESETS)[number]) ? "preset" : "custom";
    }
    setStatusMode(sm);
  }, [id, isNew, form]);

  const buildPayload = useCallback(() => {
    const v = form.getValues();
    const parsed = baseSchema.safeParse(v);
    if (!parsed.success) return null;
    const d = parsed.data;
    const tags = d.tagsInput
      ? d.tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    return {
      name: d.name,
      baseUrl: d.baseUrl,
      path: d.path,
      pathVersionPrefix: d.pathVersionPrefix ?? "",
      method: d.method,
      description: d.description || "",
      collectionId: d.collectionId,
      environmentId: d.environmentId ?? null,
      requestBodySchema: d.requestBodySchema || "",
      tags,
      headers: headers.filter((h) => h.key.trim() || h.value.trim()),
      queryParams: queryParams.filter((h) => h.key.trim() || h.value.trim()),
      responses,
      defaultResponseId,
    };
  }, [form, headers, queryParams, responses, defaultResponseId]);

  const persist = useCallback(() => {
    const payload = buildPayload();
    if (!payload) return false;
    if (isNew) {
      const created = addApi(payload.collectionId);
      updateApi(created.id, payload);
      return true;
    }
    if (!api) return false;
    updateApi(api.id, payload);
    return true;
  }, [isNew, api, buildPayload, addApi, updateApi]);

  const save = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const ok = persist();
    if (ok) navigate("/apis", { replace: true });
  };

  const watchedForm = useWatch({ control: form.control });

  const isDirty = useMemo(() => {
    if (isNew) return false;
    if (!api) return false;
    const draft = serializeEditorState(
      api.id,
      watchedForm as Partial<BaseForm>,
      headers,
      queryParams,
      responses,
      defaultResponseId,
    );
    if (draft === null) return true;
    return draft !== serializeStoredApi(api);
  }, [isNew, api, watchedForm, headers, queryParams, responses, defaultResponseId]);

  const watchedEnvId = useWatch({ control: form.control, name: "environmentId" });

  const previewEnvMap = useMemo(
    () => buildEnvVariableMap(environments, watchedEnvId ?? currentEnvId),
    [environments, watchedEnvId, currentEnvId],
  );

  const defaultResponseBody = useMemo(() => {
    const def = defaultResponseId
      ? responses.find((r) => r.id === defaultResponseId)
      : responses[0];
    if (!def) return null;
    return def.bodyJson;
  }, [responses, defaultResponseId]);

  const previewBody = useMemo(() => {
    if (!defaultResponseBody) return null;
    return substituteTemplates(defaultResponseBody, previewEnvMap);
  }, [defaultResponseBody, previewEnvMap]);

  useEffect(() => {
    if (defaultResponseId && responses.some((r) => r.id === defaultResponseId)) return;
    setDefaultResponseId(responses[0]?.id ?? null);
  }, [responses, defaultResponseId]);

  useEffect(() => {
    if (!id) navigate("/apis");
  }, [id, navigate]);

  if (!id) {
    return null;
  }

  if (!isNew && !api) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API not found</CardTitle>
          <CardDescription>It may have been deleted or the link is invalid.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/apis">Back to APIs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const resolvedPath = displayApiPath({
    baseUrl: form.watch("baseUrl"),
    pathVersionPrefix: form.watch("pathVersionPrefix") ?? "",
    path: form.watch("path"),
  });
  const playgroundRequestPath = displayApiPathWithQuery(
    {
      baseUrl: form.watch("baseUrl"),
      pathVersionPrefix: form.watch("pathVersionPrefix") ?? "",
      path: form.watch("path"),
    },
    queryParams,
  );

  const updatePair = (kind: "headers" | "queryParams", rowId: string, field: "key" | "value", value: string) => {
    const setter = kind === "headers" ? setHeaders : setQueryParams;
    setter((rows) => rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  };

  const addPair = (kind: "headers" | "queryParams") => {
    const row = { id: newId(), key: "", value: "" };
    if (kind === "headers") setHeaders((h) => [...h, row]);
    else setQueryParams((h) => [...h, row]);
  };

  const removePair = (kind: "headers" | "queryParams", rowId: string) => {
    if (kind === "headers") setHeaders((h) => (h.length <= 1 ? h : h.filter((x) => x.id !== rowId)));
    else setQueryParams((h) => (h.length <= 1 ? h : h.filter((x) => x.id !== rowId)));
  };

  const addResponse = () => {
    const r: MockResponse = {
      id: newId(),
      statusCode: 200,
      delayMs: 0,
      responseType: "success",
      bodyJson: "{\n  \"ok\": true\n}",
    };
    setResponses((list) => [...list, r]);
    setStatusMode((m) => ({ ...m, [r.id]: "preset" }));
    setDefaultResponseId((d) => d ?? r.id);
  };

  const removeResponse = (rid: string) => {
    setResponses((list) => {
      if (list.length <= 1) return list;
      return list.filter((r) => r.id !== rid);
    });
  };

  const cloneResponse = (rid: string) => {
    const r = responses.find((x) => x.id === rid);
    if (!r) return;
    const c: MockResponse = {
      ...r,
      id: newId(),
      name: r.name ? `${r.name} (copy)` : undefined,
    };
    setResponses((list) => [...list, c]);
    setStatusMode((m) => ({ ...m, [c.id]: m[rid] ?? "preset" }));
  };

  const patchResponse = (rid: string, patch: Partial<MockResponse>) => {
    setResponses((list) => list.map((r) => (r.id === rid ? { ...r, ...patch } : r)));
  };

  const formatBody = (rid: string) => {
    const r = responses.find((x) => x.id === rid);
    if (!r) return;
    const out = formatJsonString(r.bodyJson);
    if (out.ok) patchResponse(rid, { bodyJson: out.formatted });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {form.watch("method")}
            </Badge>
            <span className="truncate font-mono text-xs text-muted-foreground">{resolvedPath}</span>
          </div>
          <div className="mt-2 flex items-start gap-2">
            <h1 className="min-w-0 flex-1 text-3xl font-bold tracking-tight">
              {isNew ? "Create mock API" : "Edit mock API"}
            </h1>
            <GuideHint section="collections-apis" className="mt-1 shrink-0" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isNew
              ? "Fill in the details below and click Create mock API to save."
              : isDirty
              ? "You have unsaved changes — click Save to return to the APIs list."
              : "No unsaved changes. Edit any field to enable Save."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isNew || isDirty) && (
            <Button type="button" onClick={() => void save()}>
              {isNew ? "Create mock API" : "Save"}
            </Button>
          )}
          {!isNew && (
            <>
              <Button variant="outline" asChild>
                <Link
                  to={`/playground?path=${encodeURIComponent(playgroundRequestPath)}&method=${encodeURIComponent(form.watch("method"))}`}
                >
                  Try in playground
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  duplicateApi(api!.id);
                }}
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="schema">Request schema</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader>
                <CardTitle>Endpoint</CardTitle>
                <CardDescription>Required fields for routing and display.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="name">API name</Label>
                  <Input id="name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input id="baseUrl" placeholder={getCompanionApiBaseUrl()} {...form.register("baseUrl")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="path">Endpoint path</Label>
                  <Input id="path" placeholder="/users" {...form.register("path")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pvp">Version prefix (optional)</Label>
                  <Input id="pvp" placeholder="/v1" {...form.register("pathVersionPrefix")} />
                  <p className="text-xs text-muted-foreground">Inserted after base pathname for matching only.</p>
                </div>
                <div className="space-y-2">
                  <Label>HTTP method</Label>
                  <Select
                    value={form.watch("method")}
                    onValueChange={(v) => form.setValue("method", v as HttpMethod, { shouldDirty: true })}
                  >
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
                <div className="space-y-2">
                  <Label>Collection</Label>
                  <Select
                    value={form.watch("collectionId") ?? "none"}
                    onValueChange={(v) => form.setValue("collectionId", v === "none" ? null : v, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Uncategorized" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Uncategorized</SelectItem>
                      {collections.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Environment override</Label>
                  <Select
                    value={form.watch("environmentId") ?? "inherit"}
                    onValueChange={(v) =>
                      form.setValue("environmentId", v === "inherit" ? null : v, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Inherit global" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">Inherit global active env</SelectItem>
                      {environments.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    When set, this environment's variables override the globally active one for this API.
                  </p>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={2} {...form.register("description")} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input id="tags" placeholder="auth, v1" {...form.register("tagsInput")} />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Headers</CardTitle>
                <CardDescription>Optional static response headers (merged with Content-Type: application/json).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {headers.map((row) => (
                  <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input placeholder="Key" value={row.key} onChange={(e) => updatePair("headers", row.id, "key", e.target.value)} />
                    <Input placeholder="Value" value={row.value} onChange={(e) => updatePair("headers", row.id, "value", e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePair("headers", row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addPair("headers")}>
                  <Plus className="h-4 w-4" />
                  Add header
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Query params</CardTitle>
                <CardDescription>Document expected query keys (matching is path + method only).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {queryParams.map((row) => (
                  <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input placeholder="Key" value={row.key} onChange={(e) => updatePair("queryParams", row.id, "key", e.target.value)} />
                    <Input placeholder="Value" value={row.value} onChange={(e) => updatePair("queryParams", row.id, "value", e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePair("queryParams", row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addPair("queryParams")}>
                  <Plus className="h-4 w-4" />
                  Add param
                </Button>
              </CardContent>
            </Card>

            {previewBody !== null && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Response preview</CardTitle>
                  <CardDescription>
                    Default response body with{" "}
                    <span className="font-medium text-foreground">
                      {watchedEnvId
                        ? (environments.find((e) => e.id === watchedEnvId)?.name ?? "selected environment")
                        : currentEnvId
                        ? (environments.find((e) => e.id === currentEnvId)?.name ?? "active environment")
                        : "no environment"}
                    </span>{" "}
                    variables substituted.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(previewBody), null, 2);
                      } catch {
                        return previewBody;
                      }
                    })()}
                  </pre>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mock responses</CardTitle>
                <CardDescription>Status, delay, type, and JSON body. Supports custom error shapes.</CardDescription>
              </div>
              <Button type="button" size="sm" onClick={addResponse}>
                <Plus className="h-4 w-4" />
                Add response
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {responses.map((r) => (
                <div key={r.id} className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label className="text-xs uppercase text-muted-foreground">Default</Label>
                        <input
                          type="radio"
                          name="defResp"
                          checked={defaultResponseId === r.id}
                          onChange={() => setDefaultResponseId(r.id)}
                          className="h-4 w-4 accent-primary"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Status</Label>
                          <Select
                            value={statusMode[r.id] === "custom" ? "custom" : String(r.statusCode)}
                            onValueChange={(v) => {
                              if (v === "custom") {
                                setStatusMode((m) => ({ ...m, [r.id]: "custom" }));
                              } else {
                                setStatusMode((m) => ({ ...m, [r.id]: "preset" }));
                                patchResponse(r.id, { statusCode: Number(v) });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_PRESETS.map((c) => (
                                <SelectItem key={c} value={String(c)}>
                                  {c}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {statusMode[r.id] === "custom" ? (
                          <div className="space-y-1">
                            <Label className="text-xs">Custom code</Label>
                            <Input
                              type="number"
                              value={r.statusCode}
                              onChange={(e) => patchResponse(r.id, { statusCode: Number(e.target.value) || 0 })}
                            />
                          </div>
                        ) : null}
                        <div className="space-y-1">
                          <Label className="text-xs">Delay (ms)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={r.delayMs}
                            onChange={(e) => patchResponse(r.id, { delayMs: Math.max(0, Number(e.target.value) || 0) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Response type</Label>
                          <Select
                            value={r.responseType}
                            onValueChange={(v) => patchResponse(r.id, { responseType: v as MockResponseType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="success">Success</SelectItem>
                              <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs">Response body (JSON)</Label>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => formatBody(r.id)}>
                              Format
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {tryParseJson(r.bodyJson).ok ? "Valid JSON" : "Invalid JSON"}
                            </span>
                          </div>
                        </div>
                        <JsonEditor height="200px" value={r.bodyJson} onChange={(v) => patchResponse(r.id, { bodyJson: v })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Conditional match (JSON, optional)</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Example: <code className="rounded bg-muted px-0.5">{`{"query":{"debug":"401"}}`}</code> — headers,
                          query, and bodyContains are supported.
                        </p>
                        <Textarea
                          key={`mw-${r.id}`}
                          className="min-h-[72px] font-mono text-xs"
                          defaultValue={r.matchWhen ? JSON.stringify(r.matchWhen, null, 2) : ""}
                          placeholder="{}"
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            if (!raw) {
                              patchResponse(r.id, { matchWhen: undefined });
                              return;
                            }
                            try {
                              const obj = JSON.parse(raw) as unknown;
                              if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
                                patchResponse(r.id, { matchWhen: undefined });
                                return;
                              }
                              patchResponse(r.id, { matchWhen: obj as ResponseMatchWhen });
                            } catch {
                              /* invalid JSON — leave as typed until valid */
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => cloneResponse(r.id)}
                      aria-label="Clone response"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={responses.length <= 1}
                      onClick={() => removeResponse(r.id)}
                      aria-label="Remove response"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema">
          <Card>
            <CardHeader>
              <CardTitle>Request body schema</CardTitle>
              <CardDescription>Optional JSON example for teammates (not enforced by the mock runtime).</CardDescription>
            </CardHeader>
            <CardContent>
              <JsonEditor
                height="280px"
                value={form.watch("requestBodySchema") || "{}"}
                onChange={(v) => form.setValue("requestBodySchema", v, { shouldDirty: true })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
