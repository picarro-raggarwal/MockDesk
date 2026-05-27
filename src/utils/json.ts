export function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid JSON";
    return { ok: false, error: msg };
  }
}

export function formatJsonString(text: string): { ok: true; formatted: string } | { ok: false; error: string } {
  const parsed = tryParseJson(text);
  if (!parsed.ok) return parsed;
  try {
    return { ok: true, formatted: JSON.stringify(parsed.value, null, 2) };
  } catch {
    return { ok: false, error: "Could not stringify value" };
  }
}
