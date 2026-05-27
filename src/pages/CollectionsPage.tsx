import { useMemo, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search, Trash2, Download } from "lucide-react";
import {
  buildCollectionExport,
  collectionExportBasename,
  stringifyCollectionExport,
} from "@/services/collectionImportExport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import { GuideHint } from "@/components/GuideHint";
export function CollectionsPage() {
  const collections = useAppStore((s) => s.collections);
  const apis = useAppStore((s) => s.apis);
  const environments = useAppStore((s) => s.environments);
  const deleteCollection = useAppStore((s) => s.deleteCollection);
  const [delId, setDelId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filteredCollections = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return collections;
    return collections.filter(
      (c) => c.name.toLowerCase().includes(t) || (c.description ?? "").toLowerCase().includes(t),
    );
  }, [collections, q]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of apis) {
      const k = a.collectionId ?? "_none";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [apis]);

  const exportCollectionJson = (e: MouseEvent<HTMLButtonElement>, collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const slice = buildCollectionExport({ collections, apis, environments }, collectionId);
    if (!slice) return;
    const col = slice.collections[0];
    const base = collectionExportBasename(col?.name ?? "collection");
    const text = stringifyCollectionExport(slice);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mockdesk-collection-${base}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
            <p className="mt-1 max-w-xl text-muted-foreground">
              Group related mocks. <strong className="font-medium text-foreground">New collection</strong> asks for a
              name — click <strong className="font-medium text-foreground">Create collection</strong> on the next
              screen, then add APIs from the APIs page.
            </p>
          </div>
          <GuideHint section="collections-apis" className="mt-1" />
        </div>
        <Button asChild>
          <Link to="/collections/new">
            <Plus className="h-4 w-4" />
            New collection
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search collections…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredCollections.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="relative h-full overflow-hidden transition-colors hover:bg-muted/40">
              <Link
                to={`/collections/${c.id}`}
                className="absolute inset-0 rounded-[inherit] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Open collection ${c.name}`}
              />
              <CardHeader className="pointer-events-none flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0 flex-1 pr-1">
                  <CardTitle className="truncate">{c.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{c.description || "No description"}</CardDescription>
                </div>
                <div className="pointer-events-auto relative z-[1] flex shrink-0 items-center gap-0.5 self-start">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => exportCollectionJson(e, c.id)}
                    aria-label={`Export collection ${c.name} as JSON`}
                    title="Export collection JSON"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDelId(c.id);
                    }}
                    aria-label="Delete collection"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pointer-events-none text-xs text-muted-foreground">
                <p>
                  {counts.get(c.id) ?? 0} API{(counts.get(c.id) ?? 0) === 1 ? "" : "s"}
                </p>
                <p className="mt-1">Updated {new Date(c.updatedAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {collections.length > 0 && filteredCollections.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No collections match</CardTitle>
            <CardDescription>Try a different search term.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setQ("")}>
              Clear search
            </Button>
          </CardContent>
        </Card>
      )}

      {collections.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No collections yet</CardTitle>
            <CardDescription>Create one to organize your mock APIs for the team.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/collections/new">Create collection</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={delId !== null} onOpenChange={(o) => !o && setDelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete collection?</DialogTitle>
            <DialogDescription>APIs in this collection become uncategorized. Nothing is deleted from disk until you clear storage.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDelId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (delId) deleteCollection(delId);
                setDelId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
