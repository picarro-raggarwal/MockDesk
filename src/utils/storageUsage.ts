const LS_PREFIX = "mockdesk";

export function estimateLocalStorageBytes(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!k.includes(LS_PREFIX) && k !== "mockdesk-storage") continue;
      const v = localStorage.getItem(k) ?? "";
      total += k.length + v.length;
    }
  } catch {
    return 0;
  }
  return total * 2;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
