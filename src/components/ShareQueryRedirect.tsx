import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Send `?share=` links to Import / Export so paste hydration runs in one place. */
export function ShareQueryRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has("share")) return;
    if (location.pathname === "/import-export") return;
    navigate({ pathname: "/import-export", search: location.search }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
}
