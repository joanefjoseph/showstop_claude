import { useEffect, useState, type ReactNode } from "react";
import { hasPresaleAccess, requirePresaleMember } from "../api/purchaseFlow";
import { getSession } from "../api/purchaseSession";

/**
 * Route guard for the presale pages (2B–2E).
 * Members without presale access are sent back to 2A, which explains why
 * and shows the "Upgrade Your Membership" button.
 */
export default function PresaleGate({ children }: { children: ReactNode }) {
  // Render immediately when the cached member already has access (no flash, no extra call)
  const [allowed, setAllowed] = useState(() => {
    const m = getSession().member;
    return !!m && typeof m.presaleAccess === "boolean" && hasPresaleAccess(m);
  });

  useEffect(() => {
    if (allowed) return;
    let cancelled = false;
    requirePresaleMember()
      .then(() => { if (!cancelled) setAllowed(true); })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[presale gate] access denied:", err instanceof Error ? err.message : err);
        // replace() so the Back button doesn't bounce the user into the gate again
        window.location.replace("#/2a");
      });
    return () => { cancelled = true; };
  }, [allowed]);

  if (!allowed) {
    return (
      <div
        className="font-mono-display"
        style={{ padding: 40, textAlign: "center", fontSize: 12, color: "var(--ink-muted)" }}
      >
        Checking presale access…
      </div>
    );
  }
  return <>{children}</>;
}