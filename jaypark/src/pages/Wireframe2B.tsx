import { useEffect, useRef, useState, type FormEvent } from "react";
import TourLayout from "../components/TourLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { IMG } from "../assets";
import { findVenue } from "../data/tourVenues";
import { t, useLang } from "../i18n";
import { navigate, type PageProps } from "../routing";
import { requireMember } from "../api/purchaseFlow";
import { describeError } from "../api/bridgeClient";
import { updateSession, type MemberInfo } from "../api/purchaseSession";

/** Melon Ticket username shown in the sign-in card (MELON_USERNAME in .env). Display only. */
const MELON_USERNAME = __MELON_USERNAME__.trim();
/** Any 10 characters: the field only ever shows them masked, and no password is checked. */
const MASKED_PASSWORD = "x".repeat(10);
/** Demo copy: presale is live now; general on-sale opens this many days later. */
const GENERAL_ONSALE_IN_DAYS = 6;
/** How long the "verified" pop-up stays on screen before moving on to seat selection. */
const CONTINUE_DELAY_MS = 1500;

/**
 * 2B: presale gate between the tour list (2A) and seat selection (2C).
 * Every visit starts signed out. "Sign in" verifies the fan-club membership through the
 * bridge (POST /membership/verify for EMAIL_ADDRESS); on success a pop-up confirms the
 * member over the whole page, then the app moves on to 2C. It is the only way into 2C.
 * The "Join JWalkerz" card is a dead link.
 */
export default function Wireframe2B({ params }: PageProps) {
  const lang = useLang();
  const venue = findVenue(params.get("venue"));
  const nextHref = `#/2c?venue=${venue.id}`;

  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState<MemberInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Forced re-login: arriving on 2B (Back from 2C, Tickets on 2A, refresh, deep link) signs the fan out
  useEffect(() => {
    updateSession({ member: undefined });
    return () => window.clearTimeout(timer.current);
  }, []);

  // Move focus into the pop-up so screen readers announce it
  useEffect(() => {
    if (verified) dialogRef.current?.focus();
  }, [verified]);

  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending || verified) return;
    setPending(true);
    setError(null);
    try {
      if (!MELON_USERNAME) {
        throw new Error("MELON_USERNAME is not set in .env (restart the Vite dev server after editing it)");
      }
      const member = await requireMember(); // POST /membership/verify; throws unless eligible
      setVerified(member);
      timer.current = window.setTimeout(() => navigate(nextHref), CONTINUE_DELAY_MS);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPending(false);
    }
  };

  const busy = pending || verified !== null;

  return (
    <TourLayout
      title="Presale sign-in | Jay Park World Tour"
      topbarStart={
        <a href="#tour" className="back-link">
          ← {t(lang, "tour_title")}
        </a>
      }
    >
      <section className="section presale">
        <div className="wrap">
          <h2>{t(lang, "presale_title")}</h2>
          <p className="faq-intro">{t(lang, "presale_intro")}</p>

          {/* The stop picked on 2A + presale status */}
          <div className="purchase-panel">
            <div className="stop purchase-event">
              <div className="date">{venue.date}</div>
              <div>
                <div className="city">{venue.city}</div>
                <div className="venue">{venue.venue}</div>
              </div>
            </div>
            <div className="presale-notice" role="note">
              <strong>{t(lang, "presale_notice_title")}</strong>
              <span>{t(lang, "presale_notice", { days: GENERAL_ONSALE_IN_DAYS })}</span>
            </div>
          </div>

          <div className="member-cards">
            {/* Option 1: sign in with Melon Ticket (always the form; success is shown in the pop-up) */}
            <div className="member-card">
              <h3>{t(lang, "signin_title")}</h3>
              <p className="card-sub">{t(lang, "signin_sub")}</p>
              <form onSubmit={signIn} autoComplete="off">
                <label className="field">
                  <span>{t(lang, "username")}</span>
                  <input
                    type="text"
                    name="melon-id"
                    value={MELON_USERNAME}
                    placeholder={t(lang, "username")}
                    readOnly
                  />
                </label>
                <label className="field">
                  <span>{t(lang, "password")}</span>
                  <input
                    type="password"
                    name="melon-password"
                    value={MASKED_PASSWORD}
                    autoComplete="off"
                    readOnly
                  />
                </label>
                <div className="purchase-cta">
                  <button type="submit" className="ticket-btn" disabled={busy} aria-busy={busy}>
                    {busy ? t(lang, "signing_in") : t(lang, "sign_in")}
                  </button>
                </div>
                <BridgeErrorNote message={error} />
              </form>
            </div>

            {/* Option 2: join JWalkerz on Melon Ticket — dead link for the demo */}
            <a className="member-card join-card" href="#">
              <h3>{t(lang, "join_title")}</h3>
              <p className="card-sub">{t(lang, "join_sub")}</p>
              <div className="join-poster">
                {posterFailed ? (
                  <div className="join-poster-fallback">JWalkerz</div>
                ) : (
                  <img
                    src={IMG.jwalkerz}
                    alt={t(lang, "join_poster_alt")}
                    onError={() => setPosterFailed(true)}
                  />
                )}
              </div>
              <span className="pill-btn solid join-cta">{t(lang, "join_cta")}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Sign-in confirmation: overlays the whole page, then the app moves on to 2C */}
      {verified && (
        <div className="signin-overlay">
          <div
            ref={dialogRef}
            className="gate-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signin-verified-title"
            tabIndex={-1}
          >
            <div className="signed-in-mark" aria-hidden="true">
              ✓
            </div>
            <h2 id="signin-verified-title">{t(lang, "verified_title")}</h2>
            <div className="signed-in-name">
              {t(lang, "signed_in_as", { name: verified.displayName ?? MELON_USERNAME })}
            </div>
            <div className="signed-in-meta">
              JWalkerz · {verified.tierName} · @{verified.membershipId}
            </div>
            <p className="signin-overlay-note">{t(lang, "continuing")}</p>
          </div>
        </div>
      )}
    </TourLayout>
  );
}