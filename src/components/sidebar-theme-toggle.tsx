import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

const knobSpring = {
  type: "spring" as const,
  stiffness: 520,
  damping: 30,
  mass: 0.65
};
const iconSpring = { type: "spring" as const, stiffness: 380, damping: 28 };

/** w-12 shell (48px) − pl-0.5 (2px) − knob w-6 (24px) − right inset (~2px) */
const knobTravelX = 20;
const shellClass = "h-10 w-12";
const trackH = "h-5 w-12";
const knobSize = "h-6 w-6";
const iconSize = "size-[17px]";

export function ThemeSwitchPill({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={cn("relative shrink-0", shellClass)} aria-hidden>
      <div
        className={cn(
          "pointer-events-none absolute top-1/2 left-0 z-[1] -translate-y-1/2 overflow-hidden rounded-full border border-white/15 bg-black/25 shadow-inner ring-1 ring-inset ring-white/10 backdrop-blur-[1px]",
          trackH
        )}
      >
        <div
          className={cn(
            "absolute inset-0 opacity-60 bg-gradient-to-r",
            isDarkMode
              ? "from-indigo-500/35 via-slate-600/25 to-slate-900/40"
              : "from-sky-400/30 via-amber-200/25 to-amber-400/35"
          )}
        />
        <motion.span
          className="absolute inset-0 rounded-full"
          initial={false}
          animate={{
            boxShadow: isDarkMode
              ? "0 0 0 0 rgba(99,102,241,0)"
              : "0 0 8px 0 rgba(251,191,36,0.18)"
          }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Wrapper: vertical center via flex; motion `x` does not overwrite translate-y. */}
      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-start pl-0.5">
        <motion.span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/15",
            knobSize
          )}
          initial={false}
          animate={{ x: isDarkMode ? knobTravelX : 0 }}
          transition={knobSpring}
        >
          <span className="relative flex size-full items-center justify-center">
            <motion.span
              className={cn(
                "inset-0 flex items-center justify-center text-amber-600 right-3",
                iconSize
              )}
              initial={false}
              animate={
                isDarkMode
                  ? { opacity: 0, rotate: -85, scale: 0.4 }
                  : { opacity: 1, rotate: 0, scale: 1 }
              }
              transition={iconSpring}
            >
              <Sun className={iconSize} strokeWidth={2.5} aria-hidden />
            </motion.span>
            <motion.span
              className={cn(
                "inset-0 flex items-center justify-center text-indigo-700 left-1 absolute top-1",
                iconSize
              )}
              initial={false}
              animate={
                isDarkMode
                  ? { opacity: 1, rotate: 0, scale: 1 }
                  : { opacity: 0, rotate: 85, scale: 0.4 }
              }
              transition={iconSpring}
            >
              <Moon className={iconSize} strokeWidth={2.5} aria-hidden />
            </motion.span>
          </span>
        </motion.span>
      </div>
    </div>
  );
}

export function SidebarThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isDarkMode = theme === "dark";

  const handleToggle = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  const tooltipLabel = isDarkMode
    ? "Switch to light mode"
    : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={tooltipLabel}
      aria-pressed={isDarkMode}
      className={cn(
        "flex min-h-9 w-full items-start gap-2 rounded-lg px-2 text-left transition-colors",
        "!h-auto !py-1.5 hover:bg-transparent"
      )}
    >
      <div className="grid min-w-0 flex-1 text-left text-[12px] leading-tight">
        <span className="truncate font-semibold text-sidebar-foreground">
          Appearance
        </span>
        <span className="truncate text-[11px] text-neutral-400">
          {isDarkMode ? "Dark" : "Light"}
        </span>
      </div>
      <ThemeSwitchPill isDarkMode={isDarkMode} />
    </button>
  );
}
