import { faker } from "@faker-js/faker";

export type VarMap = Record<string, string>;

/**
 * Substitute templates in a string before JSON parsing.
 * - `{{env:KEY}}` or `{{KEY}}` — values from the variable map (case-sensitive key).
 * - `{{faker:dot.path}}` — e.g. `{{faker:internet.email}}`, `{{faker:string.uuid}}`.
 * - `{{params.KEY}}` — path parameter extracted from `:KEY` / `{KEY}` segments; also available as `{{KEY}}`.
 */
export function substituteTemplates(input: string, env: VarMap): string {
  return input.replace(/\{\{([\s\S]+?)\}\}/g, (_, raw: string) => {
    const inner = raw.trim();
    if (inner.startsWith("faker:")) {
      return resolveFakerPath(inner.slice(6).trim());
    }
    if (inner.startsWith("env:")) {
      const k = inner.slice(4).trim();
      return env[k] ?? `{{${raw}}}`;
    }
    // {{params.key}} — look up "params.key" in env (populated by mockEngine from extracted params)
    if (inner.startsWith("params.")) {
      return env[inner] ?? `{{${raw}}}`;
    }
    return env[inner] ?? `{{${raw}}}`;
  });
}

function resolveFakerPath(expr: string): string {
  if (!expr || expr.length > 80) return `{{faker:${expr}}}`;
  const parts = expr.split(".").filter(Boolean);
  let cur: unknown = faker;
  for (const p of parts) {
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(p)) return `{{faker:${expr}}}`;
    cur = (cur as Record<string, unknown>)?.[p];
    if (cur === undefined || cur === null) return `{{faker:${expr}}}`;
  }
  if (typeof cur === "function") {
    try {
      const out = (cur as (...a: unknown[]) => unknown)();
      return out === undefined || out === null ? "" : String(out);
    } catch {
      return `{{faker:${expr}}}`;
    }
  }
  return String(cur);
}

export function envPairsToMap(pairs: { key: string; value: string }[]): VarMap {
  const out: VarMap = {};
  for (const { key, value } of pairs) {
    const k = key.trim();
    if (k) out[k] = value;
  }
  return out;
}
