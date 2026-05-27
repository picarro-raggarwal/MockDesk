import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";
import { newId } from "@/lib/utils";
import type { AppEnvironment, KeyValuePair } from "@/types/models";

function pairsOrDefault(rows: KeyValuePair[]): KeyValuePair[] {
  return rows.length ? rows : [{ id: newId(), key: "", value: "" }];
}

export function EnvironmentsPage() {
  const environments = useAppStore((s) => s.environments);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentEnvId = useAppStore((s) => s.setCurrentEnvId);
  const addEnvironment = useAppStore((s) => s.addEnvironment);
  const updateEnvironment = useAppStore((s) => s.updateEnvironment);
  const deleteEnvironment = useAppStore((s) => s.deleteEnvironment);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () => environments.find((e) => e.id === (activeId ?? currentEnvId)) ?? environments[0],
    [environments, activeId, currentEnvId],
  );

  const vars = active ? pairsOrDefault(active.variables) : [];

  const setVars = (next: KeyValuePair[]) => {
    if (!active) return;
    updateEnvironment(active.id, { variables: next });
  };

  const updateRow = (rowId: string, field: "key" | "value", value: string) => {
    setVars(vars.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setVars([...vars, { id: newId(), key: "", value: "" }]);
  };

  const removeRow = (rowId: string) => {
    if (vars.length <= 1) return;
    setVars(vars.filter((r) => r.id !== rowId));
  };

  if (environments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Environments</h1>
          <p className="mt-1 text-muted-foreground">
            No environments found. Reset the app or import a backup from Settings to restore defaults.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Environments</h1>
          <p className="mt-1 text-muted-foreground">
            Variables power <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{KEY}}"}</code> templates in mock
            bodies and the Playground. The active environment is used at match time.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            const e = addEnvironment(`Env ${environments.length + 1}`);
            setActiveId(e.id);
            setCurrentEnvId(e.id);
          }}
        >
          <Plus className="h-4 w-4" />
          New environment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active for Playground & templates</CardTitle>
          <CardDescription>Switch which variable map is applied when resolving {"{{name}}"} and {"{{env:KEY}}"}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-[220px] flex-1 space-y-2">
            <Label>Current environment</Label>
            <Select
              value={currentEnvId ?? ""}
              onValueChange={(v) => {
                setCurrentEnvId(v || null);
                setActiveId(v || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {environments.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" asChild>
            <Link to="/playground">Open Playground</Link>
          </Button>
        </CardContent>
      </Card>

      {active && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Edit: {active.name}</CardTitle>
                <CardDescription>Keys become template variables. Empty rows are dropped on save.</CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                disabled={environments.length <= 1}
                onClick={() => {
                  if (!confirm(`Delete environment "${active.name}"?`)) return;
                  deleteEnvironment(active.id);
                  const next = environments.filter((e) => e.id !== active.id)[0];
                  setActiveId(next?.id ?? null);
                }}
                aria-label="Delete environment"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ename">Name</Label>
                <Input
                  id="ename"
                  value={active.name}
                  onChange={(e) => updateEnvironment(active.id, { name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Variables</Label>
                <div className="space-y-2">
                  {vars.map((row) => (
                    <div key={row.id} className="flex gap-2">
                      <Input
                        placeholder="KEY"
                        className="font-mono text-xs"
                        value={row.key}
                        onChange={(e) => updateRow(row.id, "key", e.target.value)}
                      />
                      <Input
                        placeholder="value"
                        className="font-mono text-xs"
                        value={row.value}
                        onChange={(e) => updateRow(row.id, "value", e.target.value)}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addRow}>
                    <Plus className="h-4 w-4" />
                    Add variable
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {environments.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>All environments</CardTitle>
            <CardDescription>Quick focus another editor context.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {environments.map((e: AppEnvironment) => (
              <Button
                key={e.id}
                type="button"
                variant={e.id === active.id ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveId(e.id);
                }}
              >
                {e.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
