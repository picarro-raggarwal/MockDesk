/**
 * Same rules as src/services/substitution.ts — used by the Node companion for default responses.
 */
import { faker } from "@faker-js/faker";

function resolveFakerPath(expr) {
  if (!expr || expr.length > 80) return `{{faker:${expr}}}`;
  const parts = expr.split(".").filter(Boolean);
  let cur = faker;
  for (const p of parts) {
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(p)) return `{{faker:${expr}}}`;
    cur = cur?.[p];
    if (cur === undefined || cur === null) return `{{faker:${expr}}}`;
  }
  if (typeof cur === "function") {
    try {
      const out = cur();
      return out === undefined || out === null ? "" : String(out);
    } catch {
      return `{{faker:${expr}}}`;
    }
  }
  return String(cur);
}

export function substituteTemplates(input, env) {
  return input.replace(/\{\{([\s\S]+?)\}\}/g, (_, raw) => {
    const inner = raw.trim();
    if (inner.startsWith("faker:")) {
      return resolveFakerPath(inner.slice(6).trim());
    }
    if (inner.startsWith("env:")) {
      const k = inner.slice(4).trim();
      return env[k] ?? `{{${raw}}}`;
    }
    // {{params.key}} — populated by the gateway from matched path segments
    if (inner.startsWith("params.")) {
      return env[inner] ?? `{{${raw}}}`;
    }
    return env[inner] ?? `{{${raw}}}`;
  });
}

export function buildEnvVariableMap(environments, currentEnvId) {
  const list = Array.isArray(environments) ? environments : [];
  const e = list.find((x) => x.id === currentEnvId) ?? list[0];
  if (!e) return {};
  const m = {};
  for (const { key, value } of e.variables ?? []) {
    const k = String(key ?? "").trim();
    if (k) m[k] = String(value ?? "");
  }
  return m;
}
