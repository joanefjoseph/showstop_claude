import { useEffect, useState, type MouseEvent } from "react";
import { verifyMembership } from "../api/purchaseFlow";
import type { MemberInfo } from "../api/purchaseSession";
import { describeError } from "../api/bridgeClient";
import "../components/NoticeLayout.css";
import TopNav from "../components/TopNav";

/* The downloaded page's images/ folder lives in /public/images (respects Vite's base URL). */
const IMG_BASE = `${import.meta.env.BASE_URL}images/`;
const IMAGES = {
  hero: `${IMG_BASE}ori.jpg`,
  avatar: `${IMG_BASE}avatar-default-4.png`,
};

const PAGE_TITLE = "EPIK HIGH NORTH AMERICA TOUR 2026";

/* index.html lines 109–116 */
const REACTIONS = [
  { emoji: "😮", count: 74 },
  { emoji: "❤️", count: 125 },
  { emoji: "😂", count: 4 },
  { emoji: "👍", count: 7 },
  { emoji: "🎉", count: 8 },
  { emoji: "🔥", count: 8 },
  { emoji: "😆", count: 8 },
  { emoji: "👏", count: 9 },
];

/* index.html lines 128–196 */
const COMMENTS = [
  { author: "andrewye9711", time: "1 week(s) ago", text: "블로형 우리 VIP1들은 뉴욕 공연때 몇시에 도착하면 될까요?" },
  { author: "Alicia", time: "1 week(s) ago", text: "what time should VIP 1 people arrive for NYC concert?" },
  { author: "babs1128", time: "1 month(s) ago", text: "Girl I want to do vip so bad but im so broke" },
  { author: "skybrigade", time: "2 month(s) ago", text: "Are the vip2 add-ons for Dallas sold out???" },
  {
    author: "Solus",
    time: "3 month(s) ago",
    text: "Whoo!!! Got 2 Vip2 tickets for me and my friend it was either get me one Vip1 ticket or two Vip2 so I chose the latter!!! Can't wait for the Seattle stop!!! 😍",
  },
];

/**
 * The original page used href="javascript:void(0);" (React warns about / blocks
 * javascript: URLs). Dead links here use href="#"; in this hash-routed app that
 * would jump back to #/2a, so keyboard activation is swallowed. Mouse clicks are
 * already blocked by the CSS dead-link rule. The PreApprovedCard's "#/2b" link is
 * untouched.
 */
function swallowDeadLinks(e: MouseEvent<HTMLDivElement>) {
  const link = (e.target as HTMLElement).closest("a");
  if (link?.getAttribute("href") === "#") e.preventDefault();
}

type MemberState =
  | { kind: "loading" }
  | { kind: "ready"; member: MemberInfo }
  | { kind: "error"; message: string };

/* Pre-approved card — carried over unchanged from the previous Wireframe2A,
   except for className="preapproved-card" (exempts it from the dead-link CSS). */
function PreApprovedCard({ member }: { member: MemberState }) {
  const m = member.kind === "ready" ? member.member : null;

  // Presale eligible = the tier includes presale access AND the membership is active
  const hasPresale = !!m && m.presaleAccess && m.eligibleToPurchase;

  const handle = m ? `@${m.membershipId}` : member.kind === "loading" ? "verifying…" : "unverified";
  const tierLabel = m
    ? `${m.tierName} Member`
    : member.kind === "loading" ? "checking membership" : member.kind === "error" ? member.message : "unverified";

  const statusText =
    hasPresale ? "Status: Pre-Approved for Day 1 Presale Window" :
    member.kind === "loading" ? "Status: Checking presale eligibility…" :
    member.kind === "error" ? "Status: Membership could not be verified" :
    !m!.eligibleToPurchase ? `Status: Not eligible — ${m!.reason ?? m!.status}` :
    `Status: ${m!.tierName} tier does not include presale access`;

  // Button state
  const isLoading = member.kind === "loading";
  const buttonLabel = hasPresale
    ? "🎫 Go to Native Tour Box Office (Tickets Tab)"
    : isLoading
      ? "Checking presale access…"
      : "Upgrade Your Membership";
  const buttonColor = hasPresale || isLoading ? "var(--accent)" : "var(--success)";

  return (
    <div
      className="preapproved-card"
      style={{
        border: "1.5px solid #000",
        background: "linear-gradient(135deg, #fafafa 0%, #ececec 100%)",
        padding: "12px 14px",
        borderRadius: 2,
        marginBottom: 12,
      }}
    >
      <div
        className="font-mono-display"
        style={{ fontSize: 10, fontWeight: 700, color: "#000", marginBottom: 8 }}
      >
        🌟 HIGH SKOOL MEMBERSHIP EXCLUSIVE BENEFIT
      </div>
      <div className="font-mono-display" style={{ fontSize: 11, color: "var(--ink)", marginBottom: 4 }}>
        You are logged in as:{" "}
        <strong>{handle}</strong> ({tierLabel})
      </div>
      <div
        className="font-mono-display"
        style={{
          fontSize: 11,
          color: hasPresale ? "var(--success)" : "var(--warn)",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{hasPresale ? "✅" : isLoading ? "⏳" : "⚠️"}</span> {statusText}
      </div>
      <div
        className="font-mono-display"
        style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 10 }}
      >
        Presale Opens: Today at 10:00 AM EST
      </div>

      {/* Presale tiers → 2B (Tour Box Office). Everyone else → dead "Upgrade" link. */}
      <a
        href={hasPresale ? "#/2b" : "#"}
        onClick={(e) => {
          if (!hasPresale) e.preventDefault(); // dead link: stays on 2A
        }}
        aria-disabled={!hasPresale}
        style={{
          background: buttonColor,
          color: "#fff",
          padding: "9px 16px",
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
          borderRadius: 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          cursor: isLoading ? "wait" : "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {buttonLabel}
      </a>
    </div>
  );
}

/* index.html lines 77–106 */
function VipFaq() {
  return (
    <div className="html-render">
      <p><strong>VIP Package Information and FAQ</strong></p><br />

      <p>
        <strong>Are tickets and VIP packages refundable? </strong><br />
        All ticket and VIP package sales are final. There are no refunds or exchanges.
      </p><br />

      <p>
        <strong>Can I transfer VIP packages and tickets? </strong><br />
        Everyone checking in for a VIP experience on the day of the event will be required to show a
        valid government-issued ID that matches the information of the original ticket purchaser. If
        you purchase a VIP package and then want to transfer the ticket(s) to someone else, the person
        you are transferring ticket(s) to will also need to have a copy of the original purchaser’s
        valid government-issued ID to be able to check-in, be admitted to the show and receive any VIP
        benefits.
      </p><br />

      <p>
        <strong>Will I receive my ticket(s) right after purchase?</strong><br />
        All tickets will be available according to the applicable ticketing platform’s policies.
        Please inquire with the applicable platform for questions on this topic.
      </p><br />

      <p>
        <strong>Where are the rules for the GA to VIP 1 upgrade giveaway?</strong><br />
        <a href="#">https://epikhigh.com/contents/6a7095b03a5e8839bab2bd9d</a>
      </p><br />

      <p>
        <strong>Am I allowed to bring my Park Kyu Bong official lightstick to the show?</strong><br />
        Absolutely!
      </p><br />

      <p>
        <strong>Will the Park Kyu Bong Official Lightstick be sold at the shows? </strong><br />
        Due to unprecedented demand and global logistics, it is unlikely that the Park Kyu Bong
        Official Lightstick will be sold at the shows. If you want to have one at the show, please
        order one well ahead of time, taking shipping and delivery times into account, at{" "}
        <a href="#">the Epik High Shop</a>.
      </p><br />

      <p>
        <strong>Are there any trigger warnings for the show?</strong><br />
        This show may include lasers, strobe lights, synthetic smoke and fog, and/or high intensity
        sound. People who may be sensitive to these elements should consider whether attending is
        advisable for them. Please feel free to reach out to admin@fansight.io with questions.
      </p><br />

      <p>
        <strong>How can I request ADA accommodations? </strong><br />
        Please contact the applicable venue directly for any ADA requests.
      </p><br />

      <p>
        <strong>What if I have additional questions?</strong><br />
        If you have any questions or concerns, please contact <a href="#">admin@fansight.io</a>
      </p>
    </div>
  );
}

export default function Wireframe2A() {
  // <title> of the original page; restored when navigating to another wireframe.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // Step 2 of the bridge flow: POST /membership/verify with EMAIL_ADDRESS from .env
  const [member, setMember] = useState<MemberState>({ kind: "loading" });
  useEffect(() => {
    let cancelled = false;
    verifyMembership()
      .then((m) => { if (!cancelled) setMember({ kind: "ready", member: m }); })
      .catch((err) => { if (!cancelled) setMember({ kind: "error", message: describeError(err) }); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="wv-page" onClick={swallowDeadLinks}>
      <TopNav />

      <main className="main-container">
        <header className="post-header">
          <h1 className="post-title">EPIK HIGH NORTH AMERICA TOUR 2026</h1>
          <div className="post-meta"><span>2026.06.02</span></div>
        </header>

        <section className="post-content">
          {/* Pre-approved card: first item in post-content, directly above the hero image */}
          <PreApprovedCard member={member} />

          <figure className="hero-image">
            <img src={IMAGES.hero} alt="Epik High Tour" />
          </figure>

          <VipFaq />

          <div className="reactions-bar">
            {REACTIONS.map((r) => (
              <button key={r.emoji} type="button" className="reaction-btn">
                <span>{r.emoji}</span> {r.count}
              </button>
            ))}
            <button type="button" className="reaction-btn">
              <span>+</span>
            </button>
          </div>
        </section>

        <section className="comments-section">
          <div className="comments-header">
            <h2>Comments 108</h2>
            <button type="button" className="add-comment-btn" disabled>
              Add a comment
            </button>
          </div>

          <div className="comment-list">
            {COMMENTS.map((c) => (
              <div key={c.author} className="comment">
                <img src={IMAGES.avatar} alt="avatar" className="avatar" />
                <div className="comment-content">
                  <div className="comment-meta">
                    <span className="author">{c.author}</span>
                    <span className="time">{c.time}</span>
                  </div>
                  <p className="comment-text">{c.text}</p>
                  <div className="comment-actions">
                    <button type="button" className="reply-btn">Reply</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}