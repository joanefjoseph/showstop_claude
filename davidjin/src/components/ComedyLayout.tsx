import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { goToSection, navigate } from "../routing";
import "./ComedyLayout.css";

const LOGO = `${import.meta.env.BASE_URL}images/logo.png`;
const DEFAULT_TITLE = "David Jin | Stand-Up Comedy";

interface ComedyLayoutProps {
  children: ReactNode;
  /** document.title while the page is mounted */
  title?: string;
}

/**
 * Site chrome for every page (2B–2E): the fixed navbar and contact footer from the
 * original index.html, plus script.js's behaviour:
 *  - "#section" links scroll to that section, or open 2B at it if this page doesn't have it;
 *  - navbar links close the mobile menu;
 *  - dead links (href="#") are swallowed, since "#" would otherwise clear the hash route.
 * Route links (#/2c?…) are left to their own handlers.
 */
export default function ComedyLayout({ children, title = DEFAULT_TITLE }: ComedyLayoutProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const onPageClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as Element).closest("a");
    const href = link?.getAttribute("href");
    if (!link || !href?.startsWith("#") || href.startsWith("#/")) return;
    e.preventDefault();
    if (link.closest(".nav-links")) setMenuOpen(false);
    if (href !== "#") goToSection(href.slice(1));
  };

  return (
    <div className="js-page" onClick={onPageClick}>
      {/* Sticky Navigation */}
      <header id="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <a
              href="#/2b"
              className="logo"
              onClick={(event) => {
                event.preventDefault();
                navigate("#/2b");
              }}
            >
              {logoFailed ? (
                <span className="text-logo">DAVID JIN</span>
              ) : (
                <img src={LOGO} alt="David Jin Logo" onError={() => setLogoFailed(true)} />
              )}
            </a>

          </div>

          <button
            type="button"
            className="mobile-toggle"
            aria-label="Toggle Menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>

          <nav className={menuOpen ? "nav-links active" : "nav-links"}>
            <a href="#shows" className="nav-link">Tour Dates</a>
            <a href="#videos" className="nav-link">Videos</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#contact" className="nav-link">Contact</a>
            <a href="#shows" className="btn-primary nav-cta">Get Tickets</a>
            {/* Dead link: looks like "my profile", goes nowhere */}
            <a href="#" className="profile-link" aria-label="My profile" title="My profile">
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="10" r="3.2" />
                <path d="M5.8 18.6a7 7 0 0 1 12.4 0" />
              </svg>
            </a>
          </nav>
        </div>
      </header>

      {children}

      {/* Footer / Contact Section */}
      <footer id="contact" className="footer">
        <div className="container footer-grid">
          <div className="footer-col">
            <h3>Contact</h3>
            <p><strong>Booking:</strong> booking@davidjincomedy.com</p>
            <p><strong>Press:</strong> press@davidjincomedy.com</p>
          </div>
          <div className="footer-col">
            <h3>Follow David</h3>
            <div className="social-links">
              <a href="#">Instagram</a>
              <a href="#">TikTok</a>
              <a href="#">YouTube</a>
              <a href="#">X / Twitter</a>
            </div>
          </div>
          <div className="footer-col">
            <h3>Join the Mailing List</h3>
            {/* Dead form: validates the email, then goes nowhere */}
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Enter your email" required />
              <button type="submit" className="btn-primary">Subscribe</button>
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 David Jin Comedy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}