import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Boxes,
  Brackets,
  FolderKanban,
  Keyboard,
  Play,
  Upload,
  Webhook,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const sections: {
  title: string;
  icon: typeof BookOpen;
  description: string;
  bullets: string[];
  links?: { to: string; label: string }[];
}[] = [
  {
    title: "First run & sample data",
    icon: BookOpen,
    description: "Fresh installs seed collections, APIs, two environments, and WS scenarios when storage is empty.",
    bullets: [
      "Open Dashboard — you should see sample counts for APIs, collections, and links to try flows.",
      "Samples include Auth (login + conditional 401 via ?debug=401), Users, Platform (/health), Commerce (orders, versioned profile, conditional product by ?sku=42).",
      "Switch environments under Environments to see {{userId}} and other variables change in templated responses.",
    ],
    links: [{ to: "/", label: "Dashboard" }],
  },
  {
    title: "Collections & APIs",
    icon: FolderKanban,
    description: "Group endpoints; each API has method, base URL, path, optional version prefix, headers, query docs, and multiple responses.",
    bullets: [
      "Create or edit a collection, then create APIs inside it (or leave uncategorized).",
      "Use path version prefix to match e.g. /api/v1/profile while keeping a short endpoint path in the editor.",
      "Clone a response to fork status bodies; set one response as default for the usual case.",
      "Conditional responses: JSON matchWhen supports headers, query key/value pairs, and bodyContains for POST bodies.",
    ],
    links: [
      { to: "/collections", label: "Collections" },
      { to: "/apis", label: "APIs" },
    ],
  },
  {
    title: "Environments & templates",
    icon: Brackets,
    description: "Variables apply to the active environment when resolving mock response bodies in the Playground and engine.",
    bullets: [
      "Use {{KEY}} for a variable from the active environment; {{env:KEY}} if you need an explicit prefix.",
      "Use {{faker:person.fullName}} style paths with @faker-js/faker for random demo data (see faker docs for segments).",
      "Staging vs Local sample envs ship with different baseUrl, token, userId, and featureFlag values.",
    ],
    links: [{ to: "/environments", label: "Environments" }],
  },
  {
    title: "Playground",
    icon: Play,
    description: "Send method + path (or full URL). Parsed query and headers/body feed conditional matching.",
    bullets: [
      "Example: POST /api/auth/login with default body → 200 token; same path with ?debug=401 → 401 response.",
      "GET /api/products/detail?sku=42 hits the conditional product response; omit sku for the default message.",
      "GET /api/v1/profile demonstrates version prefix + templates ({{userId}}, {{featureFlag}}).",
    ],
    links: [{ to: "/playground", label: "Playground" }],
  },
  {
    title: "WS lab",
    icon: Webhook,
    description:
      "Preview scenarios in-browser, or connect any WebSocket client to the Node companion to stream the same scripted payloads your app would handle.",
    bullets: [
      "Companion upgrades HTTP to WebSocket on the same port; the URL path selects the scenario (exact path match, otherwise the first scenario).",
      "Frames: mockdesk.open (metadata), each scenario message as text (usually JSON), then mockdesk.eos when the script ends. Set MOCKDESK_WS_LOOP=1 on the companion to repeat until disconnect.",
      "In MockDesk: WS lab → Live stream — paste ws://127.0.0.1:8787/your/scenario/path and Connect. Override host with VITE_COMPANION_WS_ORIGIN in .env if needed.",
    ],
    links: [{ to: "/ws-lab", label: "WS lab" }],
  },
  {
    title: "Import, export & share",
    icon: Upload,
    description: "v1.1 JSON includes collections, apis, environments, currentEnvId, and wsScenarios.",
    bullets: [
      "Merge preserves IDs where possible; overwrite replaces workspace state (except you can restore from a file).",
      "OpenAPI tab imports operations as new APIs into a chosen collection.",
      "Share link encodes a compressed backup in ?share= — landing with that query opens Import / Export.",
    ],
    links: [{ to: "/import-export", label: "Import / Export" }],
  },
  {
    title: "Companion server (optional)",
    icon: Boxes,
    description:
      "Node CLI: HTTP mocks with the same matchWhen rules as the Playground, plus WebSocket scenario streaming from the same v1.1 export.",
    bullets: [
      "Run: npm run companion -- ./mockdesk-app.json — HTTP and WebSocket share PORT (default 8787).",
      "HTTP picks responses by matchWhen (query, headers, bodyContains) when set; otherwise defaultResponseId. {{env:…}} / {{KEY}} / {{faker:…}} are substituted from export environments.",
    ],
    links: [{ to: "/settings", label: "Settings (backup)" }],
  },
  {
    title: "Keyboard shortcuts",
    icon: Keyboard,
    description: "Press ? outside inputs for the shortcut dialog. Chords: press g, then within ~1s:",
    bullets: [
      "a → APIs · p → Playground · i → Import / Export · e → Environments · h → this Guide",
      "Theme: Appearance row in the sidebar footer (compact pill + tooltip on small screens in the header) toggles light/dark.",
    ],
  },
];

export function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Guide</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Working instructions for MockDesk: how sample data maps to features, where to click next, and how matching and
          templates behave end-to-end.
        </p>
      </div>

      <div className="grid gap-6">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.2) }}
          >
            <Card>
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <section.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                {section.links && section.links.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      {section.links.map((l) => (
                        <Link
                          key={l.to}
                          to={l.to}
                          className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {l.label} →
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
