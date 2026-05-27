import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { GUIDE_HINT_SUMMARY, type GuideSectionId } from "@/constants/guideHints";

export interface GuideHintProps {
  /** Section anchor on `/guide#…` */
  section: GuideSectionId;
  className?: string;
}

export function GuideHint({ section, className }: GuideHintProps) {
  const summary = GUIDE_HINT_SUMMARY[section];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
            className,
          )}
          aria-label="Help — open summary and Guide link"
        >
          <Info className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[min(100vw-2rem,20rem)] p-3" sideOffset={6}>
        <p className="text-sm leading-snug text-muted-foreground">{summary}</p>
        <Link
          to={`/guide#${section}`}
          className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Open in Guide →
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
