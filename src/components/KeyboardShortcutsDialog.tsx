import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest("[data-hotkeys-ignore]")) return true;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

const rows: [string, string][] = [
  ["?", "Open this shortcuts list (when not typing in a field)."],
  ["g then a", "Go to APIs (within about one second)."],
  ["g then p", "Go to Playground."],
  ["g then i", "Go to Import / Export."],
  ["g then e", "Go to Environments."],
  ["g then h", "Open this Guide page."],
];

export function KeyboardShortcutsDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const gWait = useRef<number | null>(null);

  useEffect(() => {
    const clearG = () => {
      if (gWait.current != null) {
        window.clearTimeout(gWait.current);
        gWait.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const k = e.key.toLowerCase();

      if (k === "g") {
        if (gWait.current != null) clearG();
        gWait.current = window.setTimeout(clearG, 900);
        return;
      }

      if (gWait.current != null) {
        if (["a", "p", "i", "e", "h"].includes(k)) {
          e.preventDefault();
          clearG();
          if (k === "a") navigate("/apis");
          if (k === "p") navigate("/playground");
          if (k === "i") navigate("/import-export");
          if (k === "e") navigate("/environments");
          if (k === "h") navigate("/guide");
          return;
        }
        clearG();
      }

      if (e.key === "?") {
        e.preventDefault();
        setOpen(true);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearG();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Chord keys must be pressed outside of inputs and editors.</DialogDescription>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([keys, desc]) => (
              <tr key={keys} className="border-b last:border-0">
                <td className="py-2 pr-3 align-top font-mono text-xs text-primary">{keys}</td>
                <td className="py-2 text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
