/** Hash targets on `/guide` — keep in sync with `GuidePage` section `id`s. */
export const GUIDE_SECTION_IDS = [
  "first-run",
  "collections-apis",
  "environments-templates",
  "playground",
  "live-mock-gateway",
  "ws-lab",
  "import-export-share",
  "companion-server",
  "keyboard-shortcuts",
] as const;

export type GuideSectionId = (typeof GUIDE_SECTION_IDS)[number];

/** Short blurbs for the ⓘ menu; full detail stays on the Guide. */
export const GUIDE_HINT_SUMMARY: Record<GuideSectionId, string> = {
  "first-run":
    "Fresh installs have no APIs or collections — create your own. Default environments and WS lab scenarios may seed when storage is empty.",
  "collections-apis":
    "Collections group mocks. Each API has method, paths, optional version prefix, multiple JSON responses, and optional matchWhen rules (query, headers, body).",
  "environments-templates":
    "Variables in the active environment power {{KEY}} and {{faker:…}} in response bodies. Switch envs to see different values in the Playground.",
  playground:
    "Try method + path (and query) against your saved mocks. Headers and body are passed into conditional matching like the real engine.",
  "live-mock-gateway":
    "Run npm run live-mock so curl, Postman, or your app hit real HTTP. In dev, the UI syncs changes to the gateway automatically.",
  "ws-lab":
    "Script WS messages here or connect to the Node companion’s WebSocket on the same port as HTTP mocks.",
  "import-export-share":
    "v1.1 backup, collection export, merge vs overwrite, share links (?share=), and gateway copy-paste.",
  "companion-server":
    "Serve a static export file with npm run companion — good for CI or when you don’t use live sync from the UI.",
  "keyboard-shortcuts":
    "Press ? for shortcuts. Chord g then a / p / i / e / h jumps to main pages.",
};
