import { useEffect, type MouseEvent, type ReactNode } from "react";
import { goToSection } from "../routing";
import { LANGS, setLang, t, useLang } from "../i18n";
import { IMG } from "../assets";
import { TOUR_NAME } from "../data/tourVenues";

interface TourLayoutProps {
  children: ReactNode;
  /** document.title while the page is mounted */
  title?: string;
  /** Optional content at the left of the top bar (the purchase pages put a back link here) */
  topbarStart?: ReactNode;
  /** EN / 한 / ES toggle, as on the landing page */
  showLanguageToggle?: boolean;
}

/**
 * Site chrome for every page (2B–2E): background, top bar and footer from the tour page.
 * Link behaviour:
 *  - "#/route" links are left alone (their own handlers, or App's hashchange listener);
 *  - "#section" links scroll to that section, or open 2B at it if this page doesn't have it;
 *  - everything else ("#" and any external URL) is swallowed as a dead link.
 */
export default function TourLayout({
  children,
  title = TOUR_NAME,
  topbarStart,
  showLanguageToggle = true,
}: TourLayoutProps) {
  const lang = useLang();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const onPageClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as Element).closest("a");
    if (!link) return;
    const href = link.getAttribute("href") ?? "";
    if (href.startsWith("#/")) return;
    e.preventDefault();
    if (href.startsWith("#") && href.length > 1) goToSection(href.slice(1));
  };

  return (
    <div className="tour-page" onClick={onPageClick}>
      <div className="bg" aria-hidden="true" />

      <header className="topbar">
        <div className={topbarStart ? "wrap split" : "wrap"}>
          {topbarStart}
          {showLanguageToggle && (
            <div className="langtoggle" role="group" aria-label="Language">
              {LANGS.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={lang === id} onClick={() => setLang(id)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main>{children}</main>

      <footer className="wrap">
        <img className="more-vision-logo" src={IMG.moreVision} alt="More Vision" />
        <div className="links">
          {/* Dead links, as in the offline copy of the page */}
          <a href="#">{t(lang, "privacy")}</a>
          <a href="#">{t(lang, "contact")}</a>
        </div>
      </footer>
    </div>
  );
}