import { useEffect, type MouseEvent, type ReactNode } from "react";
import TopNav from "./TopNav";
import "./TourPageLayout.css";

const DEFAULT_TITLE = "2026 NORTH AMERICA TOUR | EPIK HIGH";

/**
 * Placeholder links use href="#". In this hash-routed app that would clear the
 * hash and jump back to page 2A, so those clicks are swallowed. Real routes
 * (#/2d?venue=…, #/2e?venue=…) still work.
 */
function swallowDeadLinks(e: MouseEvent<HTMLDivElement>) {
  const link = (e.target as HTMLElement).closest("a");
  if (link?.getAttribute("href") === "#") e.preventDefault();
}

interface TourPageLayoutProps {
  /** The wireframe's main content */
  children: ReactNode;
  /** document.title while the page is mounted */
  title?: string;
}

/** Page shell for 2C–2E: the shared TopNav (same as 2A/2B) above a centred content column. */
export default function TourPageLayout({ children, title = DEFAULT_TITLE }: TourPageLayoutProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="tour-page" onClick={swallowDeadLinks}>
      <TopNav />
      <main className="tour-page-main">{children}</main>
    </div>
  );
}