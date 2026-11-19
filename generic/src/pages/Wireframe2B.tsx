import { useEffect, useState } from "react";
import TourLayout from "../components/TourLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { describeError } from "../api/bridgeClient";
import { requireMember } from "../api/purchaseFlow";
import { updateSession } from "../api/purchaseSession";
import { navigate, type PageProps } from "../routing";
import { FAN_CLUB, findStop } from "../data/tour";

/** 2B: fan club sign-in. Verifies membership, and presale access for presale-only dates. */
export default function Wireframe2B({ params }: PageProps) {
  const stop = findStop(params.get("venue"));
  const email = (sessionStorage.getItem("sandbox-email") || __EMAIL_ADDRESS__).trim();
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState<{ tier: string } | null>(null);

  // Arriving here always starts a fresh sign-in.
  useEffect(() => {
    updateSession({ member: undefined });
  }, []);

  async function signIn() {
    setBusy(true);
    setError(null);
    setDenied(null);
    try {
      const member = await requireMember();
      if (stop.saleType === "PRESALE" && !member.presaleAccess) {
        updateSession({ member: undefined });
        setDenied({ tier: member.tierName });
        return;
      }
      setVerified(true);
      window.setTimeout(() => navigate(`#/2c?venue=${stop.id}`), 1500);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TourLayout>
      <main className="shell narrow">
        <h1>{stop.city} · {stop.venue}</h1>
        {stop.saleType === "PRESALE" ? (
          <p className="notice">This date is a <strong>{FAN_CLUB} presale</strong>. Sign in so we can verify your membership.</p>
        ) : (
          <p className="notice">Sign in to your {FAN_CLUB} account to buy tickets.</p>
        )}

        <div className="card">
          <h3>Sign in</h3>
          <label className="field">
            Email
            <input type="email" value={email} readOnly />
          </label>
          <label className="field">
            Password
            <input type="password" value="••••••••••" readOnly />
          </label>
          <button className="btn primary wide" onClick={signIn} disabled={busy || verified}>
            {busy ? "Verifying…" : "Sign in"}
          </button>
          <BridgeErrorNote message={error} />
          {denied && (
            <div role="alert" className="err">
              <strong>No presale access.</strong> Your {denied.tier} membership isn't eligible for this presale.
              Upgrade your membership, or come back for the general on-sale.
              <div style={{ marginTop: 8 }}><a href="#/2a">← Back to tour dates</a></div>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Not a member yet?</h3>
          <p className="muted">Join {FAN_CLUB} to unlock presale access, member pricing and exclusive drops.</p>
          <a className="btn" href="#" onClick={(e) => e.preventDefault()}>Join {FAN_CLUB}</a>
        </div>
      </main>

      {verified && (
        <div className="overlay" role="status">
          <div className="overlay-card">
            <div className="check">✓</div>
            <h2>Membership verified</h2>
            <p className="muted">Taking you to seat selection…</p>
          </div>
        </div>
      )}
    </TourLayout>
  );
}
