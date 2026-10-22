import { useEffect, useState, type ReactNode } from "react";
import { cachedMember, requireMember } from "../api/purchaseFlow";
import { describeError } from "../api/bridgeClient";
import BridgeErrorNote from "./BridgeErrorNote";

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
    <div className="gate-wrap">
      <div className="gate-card">
        <h2>Membership</h2>
        {error ? (
          <>
            <BridgeErrorNote message={error} />
            <p style={{ marginTop: 18 }}>
              <a href="#/2b">← Back to tour dates</a>
            </p>
          </>
        ) : (
          <p>Verifying membership…</p>
        )}
      </div>
    </div>
  );
}