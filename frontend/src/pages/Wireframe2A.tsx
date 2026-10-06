import { useEffect } from "react";
import "../components/NoticeLayout.css";
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

/* Images live in /public/weverse so they are served as-is (respects FIGMA_PUBLIC_URL base). */
const ASSET_BASE = `${import.meta.env.BASE_URL}weverse/`;
const IMAGES = {
  naPoster: `${ASSET_BASE}na-poster.jpg`,
  naConcertInfo: `${ASSET_BASE}na-concert-info.png`,
  euPoster: `${ASSET_BASE}eu-poster.jpg`,
  euConcertInfo: `${ASSET_BASE}eu-concert-info.png`,
};

const PAGE_TITLE = "Global Fandom Platform - Weverse";

const COMMUNITIES = [
  { name: "SEVENTEEN", avatar: AVATAR_SEVENTEEN },
  { name: "TOMORROW X TOGETHER", avatar: AVATAR_TXT },
  { name: "ENHYPEN", avatar: AVATAR_ENHYPEN },
  { name: "CORTIS", avatar: AVATAR_CORTIS },
];

const RECENT_NOTICES = [
  {
    title: "[NOTICE] On-Site Sales of BTS WORLD TOUR 'ARIRANG' IN LIMA Official Merchandise and Other Booths",
    date: "2026.10.04",
  },
  {
    title: '[NOTICE] BTS WORLD TOUR "ARIRANG" IN SANTIAGO Membership Booth "ARMY ZONE"',
    date: "2026.10.01",
  },
  {
    title: "[NOTICE] BTS POP-UP : ARIRANG IN SANTIAGO Terms & Conditions",
    date: "2026.09.30",
  },
  {
    title:
      "[NOTICE] On-Site Sales of BTS WORLD TOUR 'ARIRANG' IN BOGOTÁ Official Merchandise and Other Booths (Updated Oct 1)",
    date: "2026.09.30",
  },
  {
    title: "[NOTICE] BTS WORLD TOUR 'ARIRANG' IN LATIN AMERICA Official Light Stick User Guide",
    date: "2026.09.29",
  },
];

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

/* Pre-approved card — carried over unchanged from the previous Wireframe2A (lines 14–76) */
function PreApprovedCard() {
  return (
    <div
      style={{
        border: "1.5px solid var(--accent)",
        background: "linear-gradient(135deg, #f0f5ff 0%, #e8f0ff 100%)",
        padding: "12px 14px",
        borderRadius: 2,
        marginBottom: 12,
      }}
    >
      <div
        className="font-mono-display"
        style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}
      >
        🌟 ARMY MEMBERSHIP EXCLUSIVE BENEFIT
      </div>
      <div
        className="font-mono-display"
        style={{ fontSize: 11, color: "var(--ink)", marginBottom: 4 }}
      >
        You are logged in as:{" "}
        <strong>@CaratArmyStay</strong> (ARMY Global Regular Member)
      </div>
      <div
        className="font-mono-display"
        style={{
          fontSize: 11,
          color: "var(--success)",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>✅</span> Status: Pre-Approved for Day 1 Presale Window
      </div>
      <div
        className="font-mono-display"
        style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 10 }}
      >
        Presale Opens: Today at 10:00 AM EST
      </div>
      {/* Links to 2B — Tour Box Office */}
      <a
        href="#/2b"
        style={{
          background: "var(--accent)",
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
          cursor: "pointer",
        }}
      >
        🎫 Go to Native Tour Box Office (Tickets Tab)
      </a>
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

  // Port of script.js
  useEffect(() => {
    // Functionality has been removed for this simplified UI replica.
    console.log("Weverse static replica loaded successfully.");
  }, []);

  return (
    <div className="wv-page">
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
          <div className="notice-container">
            <div className="notice-header">
              <h3 className="notice-title">
                [NOTICE] BTS WORLD TOUR 'ARIRANG' IN NORTH AMERICA &amp; EUROPE Ticket Information
              </h3>
              <div className="notice-meta">Jan 13, 10:30</div>
            </div>

            {/* Pre-approved card (kept from the former Wireframe2A) */}
            <PreApprovedCard />

            <div className="notice-body">
              <p>
                Hello.<br /><br />This is BIGHIT MUSIC.<br /><br />We are pleased to announce the upcoming 2026 BTS
                WORLD TOUR IN NORTH AMERICA &amp; EUROPE.<br />Schedules vary by country and region. Please see the
                information below before making your reservation.<br /><br /><strong>[NORTH AMERICA]</strong>
                {/* TODO: end of this line was cut off in the PDF — paste the rest from index.html line 69 */}
              </p>

              <div className="image-wrapper">
                <img src={IMAGES.naPoster} alt="NA Poster" />
              </div>

              <p><strong>- Concert Information:</strong></p>
              <div className="image-wrapper">
                <img src={IMAGES.naConcertInfo} alt="Concert Info" />
              </div>

              <p>
                <strong>- Apply for ARMY MEMBERSHIP PRESALE (US/GLOBAL) </strong><br />
                👉 <a href="#" className="link">Application Link</a><br /><br />
                <strong>* Application Period: </strong><br />
                From 12:30 am, Wednesday, January 14 to 8 am, Monday, January 19, 2026 (KST)<br />
                From 7:30 am, Tuesday, January 13 to 3 pm, Sunday, January 18, 2026 (PT)<br />
                From 8:30 am, Tuesday, January 13 to 4 pm, Sunday, January 18, 2026 (MT)<br />
                From 9:30 am, Tuesday, January 13 to 5 pm, Sunday, January 18, 2026 (CT)<br />
                From 10:30 am, Tuesday, January 13 to 6 pm, Sunday, January 18, 2026 (ET)<br /><br />
                <strong>- ARMY MEMBERSHIP PRESALE Date: </strong><br />
                TAMPA, MEXICO CITY Day 1&amp;2: From 9 am to 9:59 pm, Thursday, January 22, 2026 (Local Time)<br />
                MEXICO CITY Day 3: From 9 am to 9:59 pm, Friday, January 23 (Local Time)<br />
                STANFORD, EAST RUTHERFORD, CHICAGO: From 11 am to 9:59 pm, Thursday, January 22, 2026 (Local Time)<br />
                LAS VEGAS Day 1&amp;2, BALTIMORE, TORONTO: From 1 pm to 9:59 pm, Thursday, January 22, 2026 (Local Time)<br />
                LAS VEGAS Day 3: From 1pm to 9:59 pm, Friday, January 23, 2026 (Local Time)<br />
                EL PASO, FOXBOROUGH, ARLINGTON, LOS ANGELES Day 1&amp;2: From 3 pm to 9:59 pm, Thursday, January 22, 2026 (Local Time)<br />
                LOS ANGELES Day 3&amp;4: From 3 pm to 9:59 pm, Friday, January 23, 2026 (Local Time)<br /><br />
                <strong>- GENERAL ONSALE Date: </strong><br />
                TAMPA, MEXICO CITY: 9 am, Saturday, January 24, 2026 (Local Time) ~<br />
                STANFORD,EAST RUTHERFORD, CHICAGO: 11 am, Saturday, January 24, 2026 (Local Time) ~<br />
                LAS VEGAS, BALTIMORE, TORONTO: 1 pm, Saturday, January 24, 2026 (Local Time) ~<br />
                EL PASO, FOXBOROUGH, ARLINGTON, LOS ANGELES: 3 pm, Saturday, January 24, 2026 (Local Time) ~<br /><br />
                <strong>[EUROPE]</strong>
              </p>

              <div className="image-wrapper">
                <img src={IMAGES.euPoster} alt="Europe Poster" />
              </div>

              <p><strong>- Concert Information:</strong></p>
              <div className="image-wrapper">
                <img src={IMAGES.euConcertInfo} alt="Concert Info 2" />
              </div>

              <p>
                <strong>- Apply for ARMY MEMBERSHIP PRESALE (GLOBAL):</strong><br />
                👉 <a href="#" className="link">Application Link</a><br /><br />
                <strong>* Application Period: </strong><br />
                From 12:30 am, Wednesday, January 14 to 8 am, Monday, January 19, 2026 (KST)<br />
                From 3:30 pm, Tuesday, January 13 to 11 pm, Sunday, January 18, 2026 (GMT)<br />
                From 4:30 pm, pm, Tuesday, January 13 to 12 am, Monday, January 19, 2026 (CET)<br /><br />
                <strong>- ARMY MEMBERSHIP PRESALE Date: </strong><br />
                BRUSSELS, LONDON, MUNICH: From 1 pm to 9:59 pm, Thursday, January 22, 2026 (Local Time)<br />
                MADRID: From 2 pm to 9:59 pm, Thursday, January 22, 2026 (Local Time)<br />
                PARIS: From 3 pm to 9:59 pm, Thursday, January 22, 2026 (Local Time)<br /><br />
                <strong>- GENERAL ONSALE Date: </strong><br />
                BRUSSELS, LONDON, MUNICH: 1 pm, Saturday, January 24, 2026 (Local Time) ~<br />
                MADRID: 2 pm, Saturday, January 24, 2026 (Local Time) ~<br />
                PARIS: 3 pm, Saturday, January 24, 2026 (Local Time) ~<br /><br />
                ▶ Tour Information: <a href="#" className="link"><strong>2026BTS.COM</strong></a><br />
                ▶ Information on Tickets/Reservations:{" "}
                <a href="#" className="link"><strong>BTSWORLDTOUROFFICIAL.COM</strong></a><br /><br />
                ※ Please make sure to check the correct time and date for different time zones before applying.<br />
                ※ You must apply through Weverse to participate in the ARMY MEMBERSHIP PRESALE.<br />
                ※ Only ARMY MEMBERSHIP (US/GLOBAL) holders are eligible to participate in the ARMY MEMBERSHIP PRESALE
                for North America. Only ARMY MEMBERSHIP (GLOBAL) holders are eligible to participate in the ARMY
                MEMBERSHIP PRESALE for Europe. Please take note of the schedule, as application is not possible outside of the application period. In addition, for those who hold both US and GLOBAL Memberships, presale registration for the North American presale will be processed based on the US Membership to prevent duplicate purchases.<br />
                {/* TODO: middle of this sentence was cut off in the PDF — paste it from index.html line 131 */}
                presale will be processed based on the US Membership to prevent duplicate purchases.<br />
                ※ In each application form, please select three cities for which you wish to participate in the ARMY
                MEMBERSHIP PRESALE. To ensure smooth operation, you can only participate in the presale for the cities
                you selected.<br />
                ※ ARMY MEMBERSHIP PRESALE applications are limited to the "BTS WORLD TOUR IN NORTH AMERICA &amp;
                EUROPE" tour. Even if the concert schedule is changed or added to, you will still be eligible to shop
                for the three cities you selected.<br />
                ※ To participate in the ARMY MEMBERSHIP PRESALE through Ticketmaster, your Weverse ID (email address)
                and your Ticketmaster account email address must match. If the two email addresses do not match, please
                check  <a href="#" className="link"><strong>[here]</strong></a> for how to change your Ticketmaster email address.<br /><br />
                {/* TODO: link text / end of line cut off in the PDF — paste it from index.html line 134 */}
                <br />
                Announcements for other regions will be made sequentially.<br />
                We look forward to your enthusiastic interest and support.<br />
                Thank you.
              </p>
            </div>
          </div>
        </main>

        {/* Right Side Panel (Recent Notices) */}
        <aside className="right-panel">
          <div className="recent-header">
            <strong>Notice</strong>
            <a href="#" className="view-more">Recent Notices &gt;</a>
          </div>
          <ul className="recent-list">
            {RECENT_NOTICES.map((n) => (
              <li key={n.title} className="recent-item">
                <a href="#">
                  <span className="recent-title">
                    {n.title} <span className="badge-new">N</span>
                  </span>
                  <span className="recent-date">{n.date}</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}