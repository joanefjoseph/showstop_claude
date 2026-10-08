import type { MouseEvent } from "react";
import "./TopNav.css";

/* Same images 2A already uses (frontend/public/images/). */
const IMG_BASE = `${import.meta.env.BASE_URL}images/`;
const LOGO = `${IMG_BASE}ori.png`;
const AVATAR = `${IMG_BASE}avatar-default-4.png`;

const NAV_ITEMS = ["HOME", "CONCERT", "CHAT", "COMMUNITY", "MERCH", "MEMBERSHIP"];

/* Tour-post index.html lines 19–20 (#schedule-icon, #notification-icon). */
const SCHEDULE_ICON =
  "M7.75 2a.75.75 0 00-1.5 0v2.25H4A1.75 1.75 0 002.25 6v14c0 .966.784 1.75 1.75 1.75h16A1.75 1.75 0 0021.75 20V6A1.75 1.75 0 0020 4.25h-2.25V2a.75.75 0 00-1.5 0v2.25h-8.5V2zM7 5.75h13a.25.25 0 01.25.25v3.25H3.75V6A.25.25 0 014 5.75h3zm-3.25 5V20c0 .138.112.25.25.25h16a.25.25 0 00.25-.25v-9.25H3.75z";
const NOTIFICATION_ICON_BELL =
  "M3.25 18.75H2a.75.75 0 010-1.5h1.25V10a8.75 8.75 0 0117.5 0v7.25H22a.75.75 0 010 1.5H3.25zm16-1.5V10a7.25 7.25 0 10-14.5 0v7.25h14.5z";
const NOTIFICATION_ICON_CLAPPER = "M8 18a4 4 0 008 0h-1.5a2.5 2.5 0 01-5 0H8z";

/** Nav links are dead (as on the original page). Mouse clicks are blocked in
 *  TopNav.css; this also swallows keyboard activation so href="#" can't jump to #/2a. */
function swallowDeadLinks(e: MouseEvent<HTMLDivElement>) {
  const link = (e.target as HTMLElement).closest("a");
  if (link?.getAttribute("href") === "#") e.preventDefault();
}

/** Fixed top navigation shared by pages 2A and 2B. */
export default function TopNav() {
  return (
    <div className="top-nav" onClick={swallowDeadLinks}>
      <div className="nav-left">
        <a href="#" className="logo-container">
          <img className="logo-image" src={LOGO} alt="Epik High Logo" />
        </a>
      </div>

      <nav className="nav-center">
        {NAV_ITEMS.map((label) => (
          <a key={label} href="#" className="nav-item">
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <div className="nav-right">
        <a href="#" className="icon-btn">
          <svg className="nav-icon" viewBox="0 0 24 24">
            <path fill="currentColor" fillRule="evenodd" d={SCHEDULE_ICON} />
          </svg>
        </a>
        <a href="#" className="icon-btn notification-btn">
          <span className="notification-dot" />
          <svg className="nav-icon" viewBox="0 0 24 24">
            <path fill="currentColor" fillRule="evenodd" d={NOTIFICATION_ICON_BELL} />
            <path fill="currentColor" d={NOTIFICATION_ICON_CLAPPER} />
          </svg>
        </a>
        <a href="#" className="profile-btn">
          <img src={AVATAR} alt="My Profile" className="avatar-sm" />
        </a>
      </div>
    </div>
  );
}