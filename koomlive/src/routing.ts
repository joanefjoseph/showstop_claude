/**
 * Props every page receives from App.
 * `params` holds the query string of the URL hash, e.g. #/2c?venue=koom-live-terminal-5
 */
export interface PageProps {
  params: URLSearchParams;
}

/** Programmatic navigation; App's hashchange listener picks it up. */
export function navigate(hash: string): void {
  window.location.hash = hash.replace(/^#/, "");
}

/** The KOOM top bar is absolutely positioned (not fixed), so only a little breathing room is needed. */
const HEADER_OFFSET = 24;

/** Smooth-scrolls to a section on the current page. False if it isn't on this page. */
export function scrollToSection(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top, behavior: "smooth" });
  return true;
}

/** Top-bar links: scroll if the section is on this page, otherwise open the landing page (2B) at it. */
export function goToSection(id: string): void {
  if (!scrollToSection(id)) navigate(`#/2b?section=${encodeURIComponent(id)}`);
}