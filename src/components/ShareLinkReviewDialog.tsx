import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StagedShare } from "@/services/shareLinkImport";
import { formatShareSnapshotLine, snapshotCounts } from "@/services/shareLinkImport";

type ShareLinkReviewDialogProps = {
  open: boolean;
  staged: StagedShare;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onContinue: () => void;
};

export function ShareLinkReviewDialog({ open, staged, onOpenChange, onCancel, onContinue }: ShareLinkReviewDialogProps) {
  const counts = snapshotCounts(staged.parsed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share link</DialogTitle>
          <DialogDescription>
            Nothing imported yet. JSON is in Or paste JSON below. Cancel or close discards the link; Continue keeps it
            on the Import tab.
            <span className="mt-2 block text-muted-foreground">{formatShareSnapshotLine(counts)}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
