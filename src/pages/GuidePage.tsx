import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  Boxes,
  Brackets,
  FolderKanban,
  Keyboard,
  Play,
  Server,
  Upload,
  Webhook,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { GuideSectionId } from "@/constants/guideHints";
import { GuideHint } from "@/components/GuideHint";

const sections: {
  id: GuideSectionId;
  title: string;
  icon: typeof FolderKanban;
  description: string;
  bullets: string[];
  links?: { to: string; label: string }[];
}[] = [
  {
    id: "collections-apis",
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
    id: "environments-templates",
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
    id: "playground",
    title: "Playground",
    icon: Play,
    description: "Send method + path (or full URL). Parsed query and headers/body feed conditional matching.",
    bullets: [
      "No collections or APIs are created for you — add a collection and APIs under Collections / APIs, then try paths here.",
      "Use path version prefix when your real service mounts under /api/v1/… while you keep a short path in the editor.",
      "Templates like {{userId}} resolve from the active environment (Environments page).",
    ],
    links: [{ to: "/playground", label: "Playground" }],
  },
  {
    id: "live-mock-gateway",
    title: "Live mock gateway",
    icon: Server,
    description:
      "Run the Node gateway from this repo so real HTTP clients hit the same mocks you edit in the app. In development, the UI pushes your workspace to the gateway automatically (debounced)—no export file per change.",
    bullets: [
      "Terminal: npm run live-mock — default port 8787 (override with PORT=…). Keep npm run dev open so MockDesk can POST to /__mockdesk/sync.",
      "Call your APIs at the same origin + path as each mock’s base URL (e.g. http://127.0.0.1:8787 plus your API path). Import / Export has copy buttons for commands and the typical REST base.",
      "Optional: set MOCKDESK_SYNC_SECRET on the gateway and VITE_LIVE_MOCK_SYNC_SECRET in .env so only your UI can sync. Use VITE_LIVE_MOCK_SYNC=0 to turn off UI pushes; VITE_LIVE_MOCK_SYNC_URL if the gateway is not on localhost.",
      "Do not run live-mock and the file-based companion on the same port—use one process per port.",
    ],
    links: [{ to: "/import-export", label: "Import / Export" }],
  },
  {
    id: "ws-lab",
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
    id: "import-export-share",
    title: "Import, export & share",
    icon: Upload,
    description: "v1.1 JSON includes collections, apis, environments, currentEnvId, and wsScenarios.",
    bullets: [
      "Merge preserves IDs where possible; overwrite replaces workspace state (except you can restore from a file).",
      "Share links use ?share= (session-stored until you import). Data changes only after Merge, Overwrite, or Import as new collection.",
    ],
    links: [{ to: "/import-export", label: "Import / Export" }],
  },
  {
    id: "companion-server",
    title: "Companion server (optional)",
    icon: Boxes,
    description:
      "Node CLI: HTTP mocks with the same matchWhen rules as the Playground, plus WebSocket scenario streaming from the same v1.1 export. Use this when you want a fixed JSON file (CI, no dev UI) instead of the live gateway above.",
    bullets: [
      "Run: npm run companion -- ./mockdesk-app.json — HTTP and WebSocket share PORT (default 8787).",
      "HTTP picks responses by matchWhen (query, headers, bodyContains) when set; otherwise defaultResponseId. {{env:…}} / {{KEY}} / {{faker:…}} are substituted from export environments.",
    ],
    links: [{ to: "/settings", label: "Settings (backup)" }],
  },
  {
    id: "keyboard-shortcuts",
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
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash || hash.length <= 1) return;
    const id = decodeURIComponent(hash.slice(1));
    const el = document.getElementById(id);
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [hash]);

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Guide</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Working instructions for MockDesk: how features fit together, where to click next, and how matching and
            templates behave end-to-end.
          </p>
        </div>
        <GuideHint section="keyboard-shortcuts" className="mt-1 shrink-0" />
      </div>

      <div className="grid gap-6">
        {sections.map((section, i) => (
          <motion.div
            key={section.id}
            id={section.id}
            className="scroll-mt-24"
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
