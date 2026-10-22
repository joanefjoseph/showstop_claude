import { useEffect, type ReactNode } from "react";
import { cachedMember } from "../api/purchaseFlow";
import { findVenue } from "../data/tourVenues";
import { navigate } from "../routing";

/**
 * Route guard for the purchase pages (2C–2E). Nobody reaches them without signing in on 2B:
 * if the session has no verified, eligible member for EMAIL_ADDRESS (fresh tab, deep link,
 * or after "Sign out"), the visitor is sent to 2B's sign-in for the same stop.
 */
export default function MembershipGate({
  venueId,
  children,
}: {
  venueId: string | null;
  children: ReactNode;
}) {
  const signedIn = cachedMember()?.eligibleToPurchase === true;
  const signInHref = `#/2b?venue=${findVenue(venueId).id}`;

  useEffect(() => {
    // replace, so Back from the sign-in page doesn't bounce straight back here
    if (!signedIn) navigate(signInHref, { replace: true });
  }, [signedIn, signInHref]);

  if (signedIn) return <>{children}</>;

  return (
    <div className="gate-wrap">
      <div className="gate-card">
        <h2>Membership</h2>
        <p>Redirecting to member sign-in…</p>
      </div>
    </div>
  );
}