import { Button } from "@/components/ui/button";
import { formatShareSnapshotLine, type snapshotCounts } from "@/services/shareLinkImport";

type ShareStagedBannerProps = {
  counts: ReturnType<typeof snapshotCounts>;
  onDiscard: () => void;
};

export function ShareStagedBanner({ counts, onDiscard }: ShareStagedBannerProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Share link</span> ({formatShareSnapshotLine(counts)}). Use the
        buttons below to import, or discard.
      </p>
      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onDiscard}>
        Discard
      </Button>
    </div>
  );
}
