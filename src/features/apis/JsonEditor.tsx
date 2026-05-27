import { Suspense, lazy, useMemo } from "react";
import type { editor } from "monaco-editor";
import { cn } from "@/lib/utils";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

export interface JsonEditorProps {
  value: string;
  onChange: (v: string) => void;
  height?: string;
  className?: string;
  readOnly?: boolean;
}

export function JsonEditor({ value, onChange, height = "220px", className, readOnly }: JsonEditorProps) {
  const options = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      tabSize: 2,
      readOnly,
      automaticLayout: true,
    }),
    [readOnly],
  );

  return (
    <div className={cn("overflow-hidden rounded-md border bg-muted/30", className)}>
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center bg-muted/50 text-sm text-muted-foreground"
            style={{ height }}
          >
            Loading editor…
          </div>
        }
      >
        <MonacoEditor
          height={height}
          defaultLanguage="json"
          theme="light"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          options={options}
          onMount={(_ed, monaco) => {
            monaco.editor.defineTheme("mockdesk-light", {
              base: "vs",
              inherit: true,
              rules: [],
              colors: { "editor.background": "#fafafa" },
            });
            monaco.editor.defineTheme("mockdesk-dark", {
              base: "vs-dark",
              inherit: true,
              rules: [],
              colors: { "editor.background": "#0f1419" },
            });
            const sync = () => {
              const d = document.documentElement.classList.contains("dark");
              monaco.editor.setTheme(d ? "mockdesk-dark" : "mockdesk-light");
            };
            sync();
            const obs = new MutationObserver(sync);
            obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
          }}
        />
      </Suspense>
    </div>
  );
}
