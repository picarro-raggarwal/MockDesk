import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Boxes, FolderKanban, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { displayApiPath } from "@/utils/pathJoin";
import { DashboardOnboarding } from "@/components/DashboardOnboarding";

export function DashboardPage() {
  const apis = useAppStore((s) => s.apis);
  const collections = useAppStore((s) => s.collections);
  const totalDelay = apis.reduce((acc, a) => acc + (a.responses[0]?.delayMs ?? 0), 0);

  return (
    <div className="space-y-8">
      <DashboardOnboarding />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Ship frontend features faster with configurable mock REST endpoints, delays, and status codes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Mock APIs", value: apis.length, icon: Boxes, href: "/apis" },
          { label: "Collections", value: collections.length, icon: FolderKanban, href: "/collections" },
          { label: "Avg. first-response delay (sample)", value: `${apis.length ? Math.round(totalDelay / apis.length) : 0} ms`, icon: Timer, href: "/playground" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
                <Button variant="link" className="mt-2 h-auto p-0" asChild>
                  <Link to={item.href}>
                    Open <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
          <CardDescription>Create a mock in under 10 seconds.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/apis/new">New mock API</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/playground">Open playground</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/guide">
              <BookOpen className="mr-2 h-4 w-4" />
              How it works
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/import-export">Import JSON</Link>
          </Button>
        </CardContent>
      </Card>

      {apis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent endpoints</CardTitle>
            <CardDescription>Resolved route = base URL path + endpoint path</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {apis.slice(0, 5).map((a) => (
              <Link
                key={a.id}
                to={`/apis/${a.id}`}
                className="flex flex-col rounded-lg border bg-muted/20 p-3 text-sm transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-mono text-xs font-medium text-primary">{a.method}</span>
                <span className="mt-1 min-w-0 break-all font-mono text-xs text-muted-foreground sm:mt-0 sm:max-w-[55%]">
                  {displayApiPath(a)}
                </span>
                <span className="mt-1 min-w-0 truncate text-foreground sm:mt-0 sm:max-w-[40%] sm:text-right">{a.name}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
