import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Boxes,
  Brackets,
  FolderKanban,
  Home,
  Menu,
  Play,
  Settings,
  Upload,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageBreadcrumbs } from "@/components/PageBreadcrumbs";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { SidebarThemeToggle } from "@/components/sidebar-theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store/useAppStore";
import { useThemeClass } from "@/hooks/useThemeClass";
import { CREATED_BY } from "@/constants/version";

const nav = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/guide", label: "Guide", icon: BookOpen },
  { to: "/apis", label: "APIs", icon: Boxes },
  { to: "/collections", label: "Collections", icon: FolderKanban },
  { to: "/environments", label: "Environments", icon: Brackets },
  { to: "/ws-lab", label: "WS lab", icon: Webhook },
  { to: "/import-export", label: "Import / Export", icon: Upload },
  { to: "/playground", label: "Playground", icon: Play },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarFooter() {
  return (
    <div className="mt-auto shrink-0 border-t border-sidebar-border p-3">
      <div className="space-y-2 px-3 text-xs text-sidebar-foreground/60">
        <p>Mock REST APIs locally. Team-ready JSON.</p>
        <p>
          Press <kbd className="rounded border border-sidebar-border bg-sidebar-border/30 px-1">?</kbd> for shortcuts.
          Data stays in this browser.
        </p>
        <p className="text-sidebar-foreground/50">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/45">Created by</span>
          <span className="mt-0.5 block text-sm font-medium text-sidebar-foreground/80">{CREATED_BY}</span>
        </p>
      </div>
      <div className="mt-3 border-t border-sidebar-border/80 pt-2">
        <SidebarThemeToggle />
      </div>
    </div>
  );
}

function SidebarNav({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  return (
    <nav className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3", className)}>
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-border/40 hover:text-sidebar-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0 opacity-80" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  useThemeClass();
  const navigate = useNavigate();
  const seedDefaultsIfEmpty = useAppStore((s) => s.seedDefaultsIfEmpty);
  const didSeed = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const finish = () => {
      if (didSeed.current) return;
      didSeed.current = true;
      seedDefaultsIfEmpty();
    };
    if (useAppStore.persist.hasHydrated()) finish();
    return useAppStore.persist.onFinishHydration(() => {
      finish();
    });
  }, [seedDefaultsIfEmpty]);

  return (
    <TooltipProvider delayDuration={200}>
      <KeyboardShortcutsDialog />
      <div className="flex h-dvh min-h-0 flex-col overflow-x-hidden overflow-y-hidden bg-background">
        <div className="flex min-h-0 flex-1 w-full min-w-0">
          <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
            <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-left font-semibold tracking-tight"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                  M
                </span>
                <span>MockDesk</span>
              </button>
            </div>
            <SidebarNav />
            <SidebarFooter />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <header className="z-40 flex shrink-0 min-h-14 flex-wrap items-center gap-2 border-b bg-background/80 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:h-14 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-0 lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="flex w-[min(100vw,20rem)] flex-col border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
                >
                  <SheetHeader className="shrink-0 border-b border-sidebar-border p-4 text-left">
                    <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                        M
                      </span>
                      MockDesk
                    </SheetTitle>
                  </SheetHeader>
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                  <SidebarFooter />
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="truncate text-sm font-medium text-muted-foreground"
                >
                  MockDesk
                </motion.p>
              </div>

              <div className="min-w-0">
                <SidebarThemeToggle />
              </div>
            </header>

            <PageBreadcrumbs />

            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mx-auto w-full min-w-0 max-w-6xl"
              >
                <Outlet />
              </motion.div>
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
