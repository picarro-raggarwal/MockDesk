import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { decompressFromEncodedURIComponent } from "lz-string";
import { writePendingShareSession } from "@/services/shareLinkImport";

/**
 * Captures `?share=` into sessionStorage (survives Strict Mode remounts), strips it from the URL via navigate,
 * and sends users to Import / Export so the review + staged import flow runs there.
 */
export function ShareQueryRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has("share")) return;

    const enc = params.get("share");
    if (enc) {
      try {
        const json = decompressFromEncodedURIComponent(enc);
        if (json) writePendingShareSession(json, "review");
      } catch {
        /* invalid payload — still strip param below */
      }
    }

    params.delete("share");
    const qs = params.toString();
    const search = qs ? `?${qs}` : "";

    navigate({ pathname: "/import-export", search }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
}
