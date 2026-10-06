import { useEffect, useState, type ComponentType } from "react";
import type { PageProps } from "./routing";
import Wireframe2A from "./pages/Wireframe2A";
import Wireframe2B from "./pages/Wireframe2B";
import Wireframe2C from "./pages/Wireframe2C";
import Wireframe2D from "./pages/Wireframe2D";
import Wireframe2E from "./pages/Wireframe2E";

interface Page {
  /** URL hash, e.g. http://localhost:8443/#/2b */
  id: string;
  Component: ComponentType<PageProps>;
}

const PAGES: Page[] = [
  { id: "2a", Component: Wireframe2A }, // Weverse notice (BTS community → notice)
  { id: "2b", Component: Wireframe2B }, // Tickets tab: tour dates
  { id: "2c", Component: Wireframe2C }, // Tickets tab: seat selection (?venue=<id>)
  { id: "2d", Component: Wireframe2D }, // Tickets tab: checkout
  { id: "2e", Component: Wireframe2E }, // Tickets tab: wallet
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

  const Wireframe = PAGES[route.pageIndex].Component;
  return <Wireframe params={route.params} />;
}