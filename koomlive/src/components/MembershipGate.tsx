import { useEffect, useState, type ReactNode } from "react";
import { cachedMember, requireMember } from "../api/purchaseFlow";
import { describeError } from "../api/bridgeClient";
import BridgeErrorNote from "./BridgeErrorNote";
import KoomLayout from "./KoomLayout";

/**
 * Route guard for the purchase pages (2C–2E). Those pages read the member from the
 * session while rendering, so this makes sure EMAIL_ADDRESS has been verified first
 * (e.g. after a refresh or a deep link). No tier or presale rules.
 */
export default function MembershipGate({ children }: { children: ReactNode }) {
  // Render immediately when the member is already verified (no flash, no extra call)
  const [ready, setReady] = useState(() => cachedMember()?.eligibleToPurchase === true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    requireMember()
      .then(() => { if (!cancelled) setReady(true); })
      .catch((err) => { if (!cancelled) setError(describeError(err)); });
    return () => { cancelled = true; };
  }, [ready]);

  if (ready) return <>{children}</>;

  return (
    <KoomLayout title="Verifying membership — KOOM Live">
      <section className="intro purchase-intro">
        <div className="intro-heading">
          <p className="eyebrow">KOOM LIVE · MEMBERS ONLY</p>
          <h1>{error ? "Members Only" : "Verifying…"}</h1>
        </div>
        <div className="intro-details">
          <p className="intro-description">
            {error
              ? "We couldn't confirm an active membership for this session."
              : "Checking your KOOM membership before opening ticketing."}
          </p>
        </div>
      </section>
      <section className="purchase-section">
        <div className="section-inner gate-body">
          {error ? (
            <>
              <BridgeErrorNote message={error} />
              <a href="#/2b?section=tickets" className="button button-navy is-action">← Back to KOOM Live</a>
            </>
          ) : (
            <p className="status-note">Verifying membership…</p>
          )}
        </div>
      </section>
    </KoomLayout>
  );
}