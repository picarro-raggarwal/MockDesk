import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

function normalizeTheme(t: string): "light" | "dark" {
  return t === "dark" ? "dark" : "light";
}

export function useThemeClass() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    const root = document.documentElement;
    const raw = theme as string;
    if (raw !== "light" && raw !== "dark") {
      setTheme("light");
      root.classList.remove("dark");
      return;
    }
    root.classList.toggle("dark", normalizeTheme(raw) === "dark");
  }, [theme, setTheme]);
}
