import { useEffect, type MouseEvent, type ReactNode } from "react";
import "./WeverseCommunityLayout.css";
import {
  ICON_MENU,
  ICON_LOGO,
  ICON_NOTIFICATIONS,
  ICON_HEADER_EXTRA,
  AVATAR_SEVENTEEN,
  AVATAR_TXT,
  AVATAR_ENHYPEN,
  AVATAR_CORTIS,
} from "../assets/weverse.assets";

const ASSET_BASE = `${import.meta.env.BASE_URL}weverse/`;
const HERO_BG = `${ASSET_BASE}community-hero.jpeg`;

const PAGE_TITLE = "Global Fandom Platform - Weverse";

const COMMUNITIES = [
  { name: "SEVENTEEN", avatar: AVATAR_SEVENTEEN },
  { name: "TOMORROW X TOGETHER", avatar: AVATAR_TXT },
  { name: "ENHYPEN", avatar: AVATAR_ENHYPEN },
  { name: "CORTIS", avatar: AVATAR_CORTIS },
];

/* Community tabs from the original page, minus "Highlight", which is rendered first,
   followed by the active Tickets tab. Final order: Highlight, Tickets, Fan, Artist, … */
const COMMUNITY_TABS = ["Fan", "Artist", "Fan Letter", "Media", "LIVE", "Notice", "Shop"];

/** Renders an inline 24×24 SVG whose inner markup was copied verbatim from the original page. */
function SvgIcon({ markup }: { markup: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/**
 * Placeholder links use href="#". In this hash-routed app that would clear the hash and
 * jump back to page 2A, so those clicks are swallowed. Real routes (#/2b, #/2c, …) still work.
 */
function swallowDeadLinks(e: MouseEvent<HTMLDivElement>) {
  const link = (e.target as HTMLElement).closest("a");
  if (link?.getAttribute("href") === "#") e.preventDefault();
}

interface WeverseCommunityLayoutProps {
  /** Page content, rendered in the Main Content Area beneath the tab bar */
  children: ReactNode;
}

/**
 * BTS community page chrome (header, sidebar, hero, tabs, membership panel)
 * with the Tickets tab active. Used by pages 2B–2E.
 */
export default function WeverseCommunityLayout({ children }: WeverseCommunityLayoutProps) {
  // <title> of the original page; restored when navigating away.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // Port of script.js
  useEffect(() => {
    // Functionality has been removed for this simplified UI replica.
    console.log("Weverse static replica loaded successfully.");
  }, []);

  return (
    <div className="wv-community" onClick={swallowDeadLinks}>
      {/* Top Header */}
      <header className="global-header">
        <div className="header-left">
          <button className="icon-btn" type="button">
            <SvgIcon markup={ICON_MENU} />
          </button>
          <a href="#" className="logo-link">
            <SvgIcon markup={ICON_LOGO} />
          </a>
          <h2 className="community-title">BTS</h2>
        </div>
        <div className="header-right">
          <div className="profile-avatar" />
          <button className="icon-btn notif-btn" type="button">
            <SvgIcon markup={ICON_NOTIFICATIONS} />
            <span className="badge">99+</span>
          </button>
          <button className="icon-btn" type="button">
            <SvgIcon markup={ICON_HEADER_EXTRA} />
          </button>
        </div>
      </header>

      <div className="layout-container">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="menu-section">
            <a href="#" className="menu-item"><span className="menu-text">Home</span></a>
            <a href="#" className="menu-item"><span className="menu-text">More</span></a>
          </div>

          <div className="menu-section">
            <h4 className="section-title">My communities</h4>
            <a href="#" className="menu-item">
              <div className="avatar-placeholder" />
              <span className="menu-text">Search Communities</span>
            </a>
            {COMMUNITIES.map((c) => (
              <a key={c.name} href="#" className="menu-item">
                <img src={c.avatar || undefined} className="avatar-img" alt="" />
                <span className="menu-text">{c.name}</span>
              </a>
            ))}
          </div>

          <div className="menu-section">
            <h4 className="section-title">Go to Service</h4>
            <a href="#" className="menu-item"><span className="menu-text">Shop</span></a>
            <a href="#" className="menu-item"><span className="menu-text">Jelly Shop</span></a>
          </div>

          <div className="menu-footer">
            <a href="#" className="menu-item jelly-btn">
              <span className="menu-text">My Jelly</span> <strong className="jelly-num">0</strong>
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {/* Hero Banner */}
          <div className="hero-section">
            <div className="hero-bg" style={{ backgroundImage: `url('${HERO_BG}')` }} />
            <div className="hero-content">
              <div>
                <div className="hero-stats">
                  37.0M members <span className="joined-badge">✓ Joined</span>
                </div>
                <h2 className="hero-title">BTS</h2>
              </div>
              <button className="hero-membership-btn" type="button">+ Membership</button>
            </div>
          </div>

          {/* Tab Navigation — Tickets sits second, right after Highlight */}
          <div className="tabs">
            <a href="#" className="tab">Highlight</a>
            {/* Tickets tab — active on every page 2B–2E; returns to the Tickets landing page (2B) */}
            <a href="#/2b" className="tab tab-tickets active" aria-current="page">
              🎟 Tickets <span className="tab-new-badge">NEW</span>
            </a>
            {COMMUNITY_TABS.map((t) => (
              <a key={t} href="#" className="tab">{t}</a>
            ))}
          </div>

          {/* Tickets tab content (page-specific) */}
          <section className="wv-tab-content">{children}</section>
        </main>

        {/* Right Side Panel */}
        <aside className="right-panel">
          <div className="membership-card">
            <div className="membership-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {/* TODO: verify fill colour against webpage index.html line 167 */}
                <circle cx="12" cy="12" r="12" fill="#01C577" />
              </svg>
              <span className="membership-title">
                BTS <span className="digital-text">Digital Membership</span>
              </span>
            </div>
            <p className="membership-desc">Join Digital Membership and enjoy a variety of benefits.</p>
            <button className="membership-btn" type="button">Join Digital Membership</button>
          </div>

          <div className="membership-card">
            <div className="membership-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {/* TODO: path end + fill were cut off in the PDF (webpage index.html line 176).
                    Left half reconstructed by mirroring the right half — paste the original <path> to be exact. */}
                <path
                  d="M10.5 0.3C11.4 -0.1 12.5 -0.1 13.4 0.3L21.8 4.9C22.8 5.4 23.3 6.4 23.3 7.5V16.4C23.3 17.5 22.8 18.5 21.8 19L13.4 23.6C12.5 24.1 11.4 24.1 10.5 23.6L2.1 19C1.1 18.5 0.5 17.5 0.5 16.4V7.5C0.5 6.4 1.1 5.4 2.1 4.9L10.5 0.3Z"
                  fill="#2ABCFF"
                />
              </svg>
              <span className="membership-title">BTS Membership</span>
            </div>
            <p className="membership-desc">Join the Membership and enjoy exclusive benefits!</p>
            <button className="membership-btn" type="button">Join now</button>
          </div>
        </aside>
      </div>
    </div>
  );
}