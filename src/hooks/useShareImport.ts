import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearPendingShareSession,
  hydrateShareFromSession,
  importBodyFromPaste,
  setPendingSharePhase,
  snapshotCounts,
  type StagedShare,
} from "@/services/shareLinkImport";

type UseShareImportOptions = {
  paste: string;
  setPaste: (value: string) => void;
  setMsg: (value: string | null) => void;
  setImportExportTab: (tab: string) => void;
};

export function useShareImport({ paste, setPaste, setMsg, setImportExportTab }: UseShareImportOptions) {
  const [shareStaged, setShareStaged] = useState<StagedShare | null>(null);
  const [shareReviewOpen, setShareReviewOpen] = useState(false);
  const discardOnReviewCloseRef = useRef(true);

  const discardShare = useCallback(() => {
    clearPendingShareSession();
    setShareStaged(null);
    setPaste("");
  }, [setPaste]);

  const clearShareAfterImport = useCallback(() => {
    clearPendingShareSession();
    setShareStaged(null);
  }, []);

  useEffect(() => {
    const result = hydrateShareFromSession();
    if (result.type === "none") return;

    setImportExportTab("import");
    if (result.type === "invalid") {
      setPaste(result.paste);
      setMsg(result.error);
      return;
    }

    setMsg(null);
    setShareStaged(result.staged);
    setPaste(result.staged.json);
    setShareReviewOpen(result.openReview);
  }, [setImportExportTab, setMsg, setPaste]);

  const handleReviewOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      if (discardOnReviewCloseRef.current) discardShare();
      setShareReviewOpen(false);
    },
    [discardShare],
  );

  const cancelShareReview = useCallback(() => {
    discardShare();
    setShareReviewOpen(false);
  }, [discardShare]);

  const continueShareReview = useCallback(() => {
    if (!shareStaged) return;
    setPendingSharePhase("import");
    discardOnReviewCloseRef.current = false;
    setShareReviewOpen(false);
    setImportExportTab("import");
    setMsg(null);
    queueMicrotask(() => {
      discardOnReviewCloseRef.current = true;
    });
  }, [shareStaged, setImportExportTab, setMsg]);

  const shareIncoming = shareStaged ? snapshotCounts(shareStaged.parsed) : null;
  const importBody = importBodyFromPaste(shareStaged, paste);
  const showShareBanner = shareStaged !== null && !shareReviewOpen;

  return {
    shareStaged,
    shareReviewOpen: shareReviewOpen && shareStaged !== null,
    shareIncoming,
    importBody,
    showShareBanner,
    discardShare,
    clearShareAfterImport,
    handleReviewOpenChange,
    cancelShareReview,
    continueShareReview,
  };
}
