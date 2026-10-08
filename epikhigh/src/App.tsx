import { useEffect, useState, type ComponentType } from "react";
import type { PageProps } from "./routing";
import PresaleGate from "./components/PresaleGate";
import Wireframe2A from "./pages/Wireframe2A";
import Wireframe2B from "./pages/Wireframe2B";
import Wireframe2C from "./pages/Wireframe2C";
import Wireframe2D from "./pages/Wireframe2D";
import Wireframe2E from "./pages/Wireframe2E";

interface Page {
  /** URL hash, e.g. http://localhost:4000/#/2b */
  id: string;
  Component: ComponentType<PageProps>;
  /** Only members whose tier includes presale access may open this page */
  requiresPresale?: boolean;
}

const PAGES: Page[] = [
  { id: "2a", Component: Wireframe2A },                         // Weverse notice (BTS community → notice)
  { id: "2b", Component: Wireframe2B, requiresPresale: true },  // Tickets tab: tour dates
  { id: "2c", Component: Wireframe2C, requiresPresale: true },  // Tickets tab: seat selection (?venue=<id>)
  { id: "2d", Component: Wireframe2D, requiresPresale: true },  // Tickets tab: checkout
  { id: "2e", Component: Wireframe2E, requiresPresale: true },  // Tickets tab: wallet
];

interface Route {
  pageIndex: number;
  params: URLSearchParams;
}

/* Reads the current page (and any ?query params) from the URL hash; falls back to the first page. */
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

  const { Component: Wireframe, requiresPresale } = PAGES[route.pageIndex];
  const page = <Wireframe params={route.params} />;
  return requiresPresale ? <PresaleGate>{page}</PresaleGate> : page;
}