/**
 * Props every page receives from App.
 * `params` holds the query string of the URL hash, e.g. #/2c?venue=generic-new-york
 */
export interface PageProps {
  params: URLSearchParams;
}

/** Programmatic navigation; App's hashchange listener picks it up. */
export function navigate(hash: string, opts: { replace?: boolean } = {}): void {
  const next = hash.startsWith("#") ? hash : `#${hash}`;
  if (opts.replace) window.location.replace(next);
  else window.location.hash = next.replace(/^#/, "");
}
