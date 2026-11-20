import { useEffect, type ReactNode } from "react";
import { findStop } from "../data/tour";
import { cachedMember } from "../api/purchaseFlow";
import { navigate } from "../routing";

/**
 * Guards seat selection, payment and the ticket. A visitor without a verified, eligible member
 * (fresh tab, deep link, or after the operator switched the fan) is sent to 2B to sign in for
 * the same show. Presale dates additionally need a tier with presale access.
 */
export default function MembershipGate({ venueId, children }: { venueId: string | null; children: ReactNode }) {
  const stop = findStop(venueId);
  const member = cachedMember();
  const allowed =
    member?.eligibleToPurchase === true && (stop.saleType === "GENERAL" || member.presaleAccess === true);

  useEffect(() => {
    // replace, so Back from the sign-in page doesn't bounce straight back here
    if (!allowed) navigate(`#/2b?venue=${stop.id}`, { replace: true });
  }, [allowed, stop.id]);

  if (allowed) return <>{children}</>;
  return (
    <main className="shell narrow">
      <p className="muted">Redirecting to sign-in…</p>
    </main>
  );
}
