/**
 * Props every page receives from App.
 * `params` holds the query string of the URL hash, e.g. #/2c?venue=los-angeles
 */
export interface PageProps {
  params: URLSearchParams;
}

/** Programmatic navigation; App's hashchange listener picks it up. */
export function navigate(hash: string): void {
  window.location.hash = hash.replace(/^#/, "");
}