import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Filter, MoreHorizontal, Pencil, Play, Plus, Search, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import { displayApiPath, displayApiPathWithQuery } from "@/utils/pathJoin";
import { cn } from "@/lib/utils";
import type { HttpMethod, MockApi, MockResponse } from "@/types/models";
import { GuideHint } from "@/components/GuideHint";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function responseHasConditionalRules(r: MockResponse): boolean {
  const w = r.matchWhen;
  if (!w) return false;
  const h = w.headers && Object.keys(w.headers).length > 0;
  const q = w.query && Object.keys(w.query).length > 0;
  const b = Boolean(w.bodyContains?.trim());
  return Boolean(h || q || b);
}

function apiHasConditionalResponse(api: MockApi): boolean {
  return api.responses.some(responseHasConditionalRules);
}

export function ApisPage() {
  const apis = useAppStore((s) => s.apis);
  const collections = useAppStore((s) => s.collections);
  const deleteApi = useAppStore((s) => s.deleteApi);
  const duplicateApi = useAppStore((s) => s.duplicateApi);
  const [q, setQ] = useState("");
  const [methodFilter, setMethodFilter] = useState<"all" | HttpMethod>("all");
  const [conditionalOnly, setConditionalOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = apis;
    if (t) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(t) ||
          a.path.toLowerCase().includes(t) ||
          displayApiPath(a).toLowerCase().includes(t) ||
          a.method.toLowerCase().includes(t) ||
          a.tags.some((tag) => tag.toLowerCase().includes(t)),
      );
    }
    if (methodFilter !== "all") {
      list = list.filter((a) => a.method === methodFilter);
    }
    if (conditionalOnly) {
      list = list.filter((a) => apiHasConditionalResponse(a));
    }
    return list;
  }, [apis, q, methodFilter, conditionalOnly]);

  const colName = (id: string | null) => collections.find((c) => c.id === id)?.name ?? "Uncategorized";

  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id));
  const someFilteredSelected = filtered.some((a) => selectedIds.has(a.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const confirmBulkDelete = () => {
    selectedIds.forEach((id) => deleteApi(id));
    clearSelection();
    setBulkDeleteOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-start gap-2">
            <h1 className="text-3xl font-bold tracking-tight">APIs</h1>
            <GuideHint section="collections-apis" className="mt-1" />
          </div>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Click the <strong className="font-medium text-foreground">chevron</strong> on a row to expand and preview
            all responses, headers, and query docs. <strong className="font-medium text-foreground">New API</strong> opens
            the full editor — <strong className="font-medium text-foreground">Save</strong> writes changes and returns
            here. Use <strong className="font-medium text-foreground">Playground</strong> on any row to try that mock in
            the browser. Unsaved editor work is lost if you leave without saving.
          </p>
        </div>
        <Button asChild>
          <Link to="/apis/new">
            <Plus className="h-4 w-4" />
            New API
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, path, method, tag…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1 sm:w-40">
          <Label className="text-xs text-muted-foreground">Method</Label>
          <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as "all" | HttpMethod)}>
            <SelectTrigger>
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant={conditionalOnly ? "secondary" : "outline"}
          size="sm"
          className="gap-2 sm:mb-0.5"
          onClick={() => setConditionalOnly((v) => !v)}
        >
          <Filter className="h-4 w-4" />
          Conditional responses only
        </Button>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
          <Checkbox
            id="select-all"
            checked={allFilteredSelected}
            data-state={someFilteredSelected && !allFilteredSelected ? "indeterminate" : undefined}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all visible APIs"
          />
          <label htmlFor="select-all" className="cursor-pointer select-none text-sm text-muted-foreground">
            {allFilteredSelected ? "Deselect all" : "Select all"}
          </label>
          {selectedIds.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete {selectedIds.size}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((api, i) => {
          const isOpen = openIds.has(api.id);
          const isSelected = selectedIds.has(api.id);
          return (
          <motion.div key={api.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.2) }}>
            <Card className={cn("overflow-hidden transition-colors", isSelected && "border-primary/50 bg-primary/5")}>
              <CardHeader className="flex flex-row items-start gap-2 space-y-0 pb-3 sm:gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(api.id)}
                  aria-label={`Select ${api.name}`}
                  className="mt-1 shrink-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 h-8 w-8 shrink-0"
                  aria-expanded={isOpen}
                  aria-controls={`api-panel-${api.id}`}
                  id={`api-expand-${api.id}`}
                  onClick={() => toggleOpen(api.id)}
                >
                  <ChevronRight
                    className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-90")}
                    aria-hidden
                  />
                </Button>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {api.method}
                    </Badge>
                    {api.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                    {api.tags.length > 4 ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        +{api.tags.length - 4}
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle className="truncate text-xl leading-tight">
                    <Link to={`/apis/${api.id}`} className="hover:underline">
                      {api.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="font-mono text-xs break-all">{displayApiPath(api)}</CardDescription>
                  <p className="text-xs text-muted-foreground">Collection: {colName(api.collectionId)}</p>
                  {!isOpen && (
                    <p className="text-xs text-muted-foreground">
                      {api.responses.length} response{api.responses.length === 1 ? "" : "s"} · expand for bodies and
                      rules
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-1 sm:gap-2">
                  <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2 sm:px-3" asChild>
                    <Link
                      aria-label={`${api.name}: Playground`}
                      to={`/playground?path=${encodeURIComponent(displayApiPathWithQuery(api, api.queryParams))}&method=${encodeURIComponent(api.method)}`}
                      className="inline-flex items-center"
                    >
                      <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="hidden sm:inline">Playground</span>
                    </Link>
                  </Button>
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Actions" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/apis/${api.id}`}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        duplicateApi(api.id);
                      }}
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(api.id)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent id={`api-panel-${api.id}`} role="region" aria-labelledby={`api-expand-${api.id}`} className="space-y-4 border-t pt-4">
                  <p className="text-sm text-muted-foreground">{api.description || "No description"}</p>
                  {api.headers.some((h) => h.key.trim()) || api.queryParams.some((h) => h.key.trim()) ? (
                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      {api.headers.some((h) => h.key.trim()) ? (
                        <div>
                          <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">Headers</p>
                          <ul className="space-y-0.5 font-mono text-muted-foreground">
                            {api.headers
                              .filter((h) => h.key.trim())
                              .map((h) => (
                                <li key={h.id}>
                                  {h.key}: {h.value || "—"}
                                </li>
                              ))}
                          </ul>
                        </div>
                      ) : null}
                      {api.queryParams.some((h) => h.key.trim()) ? (
                        <div>
                          <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">Query params</p>
                          <ul className="space-y-0.5 font-mono text-muted-foreground">
                            {api.queryParams
                              .filter((h) => h.key.trim())
                              .map((h) => (
                                <li key={h.id}>
                                  {h.key}: {h.value || "—"}
                                </li>
                              ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {api.requestBodySchema?.trim() ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request body schema</p>
                      <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-muted/80 p-2 font-mono text-xs">{api.requestBodySchema}</pre>
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responses</p>
                    {api.responses.map((r) => {
                      const isDefault = r.id === api.defaultResponseId;
                      return (
                        <div key={r.id} className="rounded-lg border bg-muted/20 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {r.statusCode}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{r.delayMs} ms delay</span>
                            <Badge variant={r.responseType === "error" ? "destructive" : "secondary"} className="text-xs">
                              {r.responseType}
                            </Badge>
                            {isDefault ? (
                              <Badge className="text-xs">Default</Badge>
                            ) : null}
                            {r.name ? <span className="text-sm font-medium">{r.name}</span> : null}
                          </div>
                          {responseHasConditionalRules(r) ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Conditional: <code className="rounded bg-muted px-1">{JSON.stringify(r.matchWhen)}</code>
                            </p>
                          ) : null}
                          <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted/80 p-3 font-mono text-xs leading-relaxed">
                            {r.bodyJson}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    <Button size="sm" asChild>
                      <Link to={`/apis/${api.id}`}>Open full editor</Link>
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No APIs match</CardTitle>
            <CardDescription>Try another search or create a new mock.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/apis/new">Create API</Link>
            </Button>
            <Button variant="outline" onClick={() => {
              setQ("");
              setMethodFilter("all");
              setConditionalOnly(false);
            }}>
              Clear search
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API?</DialogTitle>
            <DialogDescription>This removes the mock from local storage. Export first if you need a backup.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteApi(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={(o) => !o && setBulkDeleteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} API{selectedIds.size === 1 ? "" : "s"}?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected mocks from local storage. Export first if you need a backup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>
              Delete {selectedIds.size}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
