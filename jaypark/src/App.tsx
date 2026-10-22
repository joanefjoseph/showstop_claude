import { useEffect, useState, type ComponentType } from "react";
import type { PageProps } from "./routing";
import MembershipGate from "./components/MembershipGate";
import Wireframe2A from "./pages/Wireframe2A";
import Wireframe2B from "./pages/Wireframe2B";
import Wireframe2C from "./pages/Wireframe2C";
import Wireframe2D from "./pages/Wireframe2D";
import Wireframe2E from "./pages/Wireframe2E";

interface Page {
  /** URL hash, e.g. http://localhost:4004/#/2c */
  id: string;
  Component: ComponentType<PageProps>;
  /** The page needs a signed-in, eligible member in the session (any tier) */
  requiresMember?: boolean;
}

const PAGES: Page[] = [
  { id: "2a", Component: Wireframe2A },                        // Landing: tour dates + FAQ
  { id: "2b", Component: Wireframe2B },                        // Presale gate: JWalkerz sign-in (?venue=<id>)
  { id: "2c", Component: Wireframe2C, requiresMember: true },  // Tickets: seat selection (?venue=<id>)
  { id: "2d", Component: Wireframe2D, requiresMember: true },  // Tickets: checkout
  { id: "2e", Component: Wireframe2E, requiresMember: true },  // Tickets: mobile ticket
];

interface Route {
  pageIndex: number;
  params: URLSearchParams;
}

/* Reads the current page (and any ?query params) from the URL hash; falls back to the first page (2A). */
function routeFromHash(): Route {
  const [path = "", query = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  const index = PAGES.findIndex((p) => p.id === path.toLowerCase());
  return {
    pageIndex: index === -1 ? 0 : index,
    params: new URLSearchParams(query),
  };
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(routeFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const { Component: Wireframe, requiresMember } = PAGES[route.pageIndex];
  const page = <Wireframe params={route.params} />;
  return requiresMember ? (
    <MembershipGate venueId={route.params.get("venue")}>{page}</MembershipGate>
  ) : (
    page
  );
}