import { useEffect, type MouseEvent, type ReactNode } from "react";
import { goToSection, navigate } from "../routing";
import { koomImage } from "../data/koomImages";
import "./KoomLayout.css";
import "./KoomPurchase.css";

const DEFAULT_TITLE = "KOOM Week 2026, NYC — KOOM Live";
const NAVY = "#0a0d36";

const SOCIAL_GLYPHS = ["◎", "𝕏", "f", "in"];

const EXPLORE = ["Haus", "Stage", "Live", "Week Schedule", "Get Involved"];
const PARTICIPATE = ["Hotels", "Join a Session", "KOOM Challenge"];

interface KoomLayoutProps {
  children: ReactNode;
  /** document.title while the page is mounted */
  title?: string;
}

/**
 * Site chrome for every page (2B–2E): the top bar and footer from KOOM_Live_Static_Site/index.html.
 * - The brand mark goes home (#/2b); "Get Tickets" scrolls to the ticket card (or opens 2B at it).
 * - "#section" links scroll; dead "#" links are swallowed so they don't clear the hash route.
 */
export default function KoomLayout({ children, title = DEFAULT_TITLE }: KoomLayoutProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  // index.css paints <html> #f5f5f0; the static page's body is navy, so match it (no beige overscroll).
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.backgroundColor;
    root.style.backgroundColor = NAVY;
    return () => {
      root.style.backgroundColor = previous;
    };
  }, []);

  const onPageClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as Element).closest("a");
    const href = link?.getAttribute("href");
    if (!link || !href?.startsWith("#") || href.startsWith("#/")) return;
    e.preventDefault();
    if (href !== "#") goToSection(href.slice(1));
  };

  return (
    <div className="koom-page" onClick={onPageClick}>
      <div className="topbar">
        <a
          className="brand"
          href="#/2b"
          aria-label="KOOM Week 2026"
          onClick={(e) => {
            e.preventDefault();
            navigate("#/2b");
          }}
        >
          <span className="brand-mark">K</span>
          <span className="brand-copy">
            <strong>KOOM WEEK 2026</strong>
            <small>OCT 12–18</small>
          </span>
        </a>
        <div className="top-actions">
          <button type="button" className="button button-primary is-action" onClick={() => goToSection("tickets")}>
            Get Tickets
          </button>
          <button type="button" className="button button-light">Menu</button>
        </div>
      </div>

      <main>{children}</main>

      <footer className="footer">
        <div className="footer-grid">
          <a href="#" className="footer-logo dead-link" aria-disabled="true" tabIndex={-1} aria-label="KOOM Week">
            <img src={koomImage("koom.svg")} alt="" />
            <img src={koomImage("week.svg")} alt="" />
          </a>
          <div className="footer-column">
            <p className="eyebrow">Explore</p>
            {EXPLORE.map((label) => (
              <a key={label} href="#" className="dead-link">{label}</a>
            ))}
          </div>
          <div className="footer-column">
            <p className="eyebrow">Participate</p>
            {PARTICIPATE.map((label) => (
              <a key={label} href="#" className="dead-link">{label}</a>
            ))}
          </div>
          <div className="footer-column">
            <p className="eyebrow">KOOM</p>
            <a href="#" className="dead-link">Contact</a>
            <a href="#" className="dead-link">Donate</a>
            <div className="socials">
              {SOCIAL_GLYPHS.map((glyph, i) => (
                <span key={i}>{glyph}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>KOOM WEEK 2026 · United Korean Founders (UKF) / KOOM Inc.</span>
          <div>
            <a href="#" className="dead-link">Privacy Policy</a>
            <a href="#" className="dead-link">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}