import { Fragment, useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

export function PageBreadcrumbs() {
  const { pathname } = useLocation();
  const params = useParams();
  const apis = useAppStore((s) => s.apis);
  const collections = useAppStore((s) => s.collections);

  const crumbs = useMemo((): Crumb[] => {
    if (pathname === "/") return [];

    const out: Crumb[] = [{ label: "Dashboard", href: "/" }];

    if (pathname.startsWith("/guide")) {
      out.push({ label: "Guide" });
      return out;
    }
    if (pathname.startsWith("/apis")) {
      out.push({ label: "APIs", href: "/apis" });
      if (pathname === "/apis/new") {
        out.push({ label: "New API" });
      } else if (params.id) {
        const a = apis.find((x) => x.id === params.id);
        out.push({ label: a?.name?.trim() ? a.name : "Edit API" });
      }
      return out;
    }
    if (pathname.startsWith("/collections")) {
      out.push({ label: "Collections", href: "/collections" });
      if (pathname.endsWith("/new")) {
        out.push({ label: "New collection" });
      } else if (params.id) {
        const c = collections.find((x) => x.id === params.id);
        out.push({ label: c?.name?.trim() ? c.name : "Edit collection" });
      }
      return out;
    }
    if (pathname.startsWith("/environments")) {
      out.push({ label: "Environments" });
      return out;
    }
    if (pathname.startsWith("/ws-lab")) {
      out.push({ label: "WS lab" });
      return out;
    }
    if (pathname.startsWith("/import-export")) {
      out.push({ label: "Import / Export" });
      return out;
    }
    if (pathname.startsWith("/playground")) {
      out.push({ label: "Playground" });
      return out;
    }
    if (pathname.startsWith("/settings")) {
      out.push({ label: "Settings" });
      return out;
    }

    out.push({ label: "Page" });
    return out;
  }, [pathname, params.id, apis, collections]);

  if (crumbs.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-border bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4 md:px-6 lg:px-8">
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <nav aria-label="Breadcrumb" className="py-2.5 sm:py-3">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <Fragment key={`${c.label}-${i}`}>
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />}
                  <li className="flex min-w-0 items-center gap-1">
                    {i === 0 && c.href ? (
                      <Link
                        to={c.href}
                        className="inline-flex items-center gap-1 rounded-md font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Home className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only sm:not-sr-only">{c.label}</span>
                      </Link>
                    ) : c.href && !isLast ? (
                      <Link
                        to={c.href}
                        className="truncate font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {c.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          "truncate font-medium",
                          isLast ? "text-foreground" : "text-muted-foreground",
                        )}
                        aria-current={isLast ? "page" : undefined}
                      >
                        {c.label}
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
