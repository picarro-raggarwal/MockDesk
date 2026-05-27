import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STORAGE_KEY = "mockdesk-onboarding-dismissed";

export function DashboardOnboarding() {
  const [visible, setVisible] = useState(() => localStorage.getItem(STORAGE_KEY) !== "1");

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Welcome to MockDesk</CardTitle>
          <CardDescription>Three steps to productive frontend mocks.</CardDescription>
        </div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <ol className="list-inside list-decimal space-y-2">
          <li>
            Create or edit a mock under{" "}
            <Link to="/apis" className="font-medium text-primary underline-offset-4 hover:underline">
              APIs
            </Link>
            . Add multiple responses for status variants and delays.
          </li>
          <li>
            Try it in the{" "}
            <Link to="/playground" className="font-medium text-primary underline-offset-4 hover:underline">
              Playground
            </Link>{" "}
            with headers, query strings, and body text for conditional rules.
          </li>
          <li>
            Read the{" "}
            <Link to="/guide" className="font-medium text-primary underline-offset-4 hover:underline">
              Guide
            </Link>{" "}
            for all workflows. Use{" "}
            <Link to="/environments" className="font-medium text-primary underline-offset-4 hover:underline">
              Environments
            </Link>{" "}
            for <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{variables}}"}</code>, then share JSON or a
            compressed link from{" "}
            <Link to="/import-export" className="font-medium text-primary underline-offset-4 hover:underline">
              Import / Export
            </Link>
            .
          </li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={dismiss}>
            Got it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
