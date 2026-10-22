/**
 * Props every page receives from App.
 * `params` holds the query string of the URL hash, e.g. #/2c?venue=jaypark-los-angeles
 */
export interface PageProps {
  params: URLSearchParams;
}

/**
 * Programmatic navigation; App's hashchange listener picks it up.
 * `replace` swaps the current history entry (used for redirects, so Back doesn't bounce).
 */
export function navigate(hash: string, options: { replace?: boolean } = {}): void {
  const bare = hash.replace(/^#/, "");
  if (options.replace) window.location.replace(`#${bare}`);
  else window.location.hash = bare;
}

/** Smooth-scrolls to a section on the current page (no fixed navbar on this site). False if it isn't on this page. */
export function scrollToSection(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

/** "#section" links: scroll if the section is on this page, otherwise open the landing page (2A) at it. */
export function goToSection(id: string): void {
  if (!scrollToSection(id)) navigate(`#/2a?section=${encodeURIComponent(id)}`);
}