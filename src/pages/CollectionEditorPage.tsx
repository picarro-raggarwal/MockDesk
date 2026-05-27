import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/useAppStore";
import { displayApiPath } from "@/utils/pathJoin";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export function CollectionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const collections = useAppStore((s) => s.collections);
  const apis = useAppStore((s) => s.apis);
  const addCollection = useAppStore((s) => s.addCollection);
  const updateCollection = useAppStore((s) => s.updateCollection);
  const duplicateCollection = useAppStore((s) => s.duplicateCollection);

  const isNew = id === "new";
  const existing = id && !isNew ? collections.find((c) => c.id === id) : undefined;

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (isNew) {
      form.reset({ name: "", description: "" });
      return;
    }
    const c = collections.find((x) => x.id === id);
    if (c) form.reset({ name: c.name, description: c.description ?? "" });
  }, [id, isNew, collections, form]);

  useEffect(() => {
    if (!isNew && id && !existing) {
      navigate("/collections", { replace: true });
    }
  }, [isNew, id, existing, navigate]);

  const onSubmit = form.handleSubmit((data) => {
    if (isNew) {
      addCollection(data.name, data.description);
      navigate("/collections", { replace: true });
    } else if (id) {
      updateCollection(id, { name: data.name, description: data.description });
      navigate("/collections", { replace: true });
    }
  });

  const inCollection = !isNew && id ? apis.filter((a) => a.collectionId === id) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isNew ? "New collection" : "Edit collection"}</h1>
        <p className="mt-1 text-muted-foreground">
          {isNew
            ? "Name your collection, then click Create collection. Data is stored in this browser only."
            : "Update the name or description, then click Save changes."}
        </p>
      </div>

      {isNew && (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">What happens next</CardTitle>
            <CardDescription className="text-muted-foreground">
              After you create the collection, add mock APIs from the{" "}
              <Link to="/apis" className="font-medium text-primary underline-offset-4 hover:underline">
                APIs
              </Link>{" "}
              page (New API) and pick this collection in the form, or stay here and open an API from the list once
              they exist.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Name and description are stored with your workspace for import/export.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cname">Name</Label>
              <Input id="cname" {...form.register("name")} autoComplete="off" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cdesc">Description</Label>
              <Textarea id="cdesc" rows={3} {...form.register("description")} />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button type="submit">{isNew ? "Create collection" : "Save changes"}</Button>
              {isNew ? (
                <Button type="button" variant="outline" asChild>
                  <Link to="/collections">Cancel</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {!isNew && inCollection.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>APIs in this collection</CardTitle>
            <CardDescription>Click an API to edit it, or create another from the APIs page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {inCollection.map((a) => (
              <Link key={a.id} to={`/apis/${a.id}`} className="block rounded-lg border p-3 text-sm hover:bg-muted/40">
                <span className="font-mono text-xs text-primary">{a.method}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{displayApiPath(a)}</span>
                <div className="font-medium">{a.name}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {!isNew && id && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const c = duplicateCollection(id);
              if (c) navigate(`/collections/${c.id}`, { replace: true });
            }}
          >
            <Copy className="mr-1 h-3.5 w-3.5" />
            Duplicate collection
          </Button>
        </div>
      )}
    </div>
  );
}
