import { useEffect, useState, type ComponentType } from "react";
import type { PageProps } from "./routing";
import MembershipGate from "./components/MembershipGate";
import Wireframe2A from "./pages/Wireframe2A";
import Wireframe2B from "./pages/Wireframe2B";
import Wireframe2C from "./pages/Wireframe2C";
import Wireframe2D from "./pages/Wireframe2D";
import Wireframe2E from "./pages/Wireframe2E";

const PAGES: Array<{ id: string; Component: ComponentType<PageProps>; requiresMember: boolean }> = [
  { id: "2a", Component: Wireframe2A, requiresMember: false }, // tour announcement
  { id: "2b", Component: Wireframe2B, requiresMember: false }, // sign in / presale verification
  { id: "2c", Component: Wireframe2C, requiresMember: true }, // seat selection
  { id: "2d", Component: Wireframe2D, requiresMember: true }, // payment
  { id: "2e", Component: Wireframe2E, requiresMember: true }, // ticket + add-ons
];

function routeFromHash() {
  const [path = "", query = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  const index = PAGES.findIndex((p) => p.id === path.toLowerCase());
  return { pageIndex: index === -1 ? 0 : index, params: new URLSearchParams(query) };
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

  const { Component: Page, requiresMember } = PAGES[route.pageIndex];
  const page = <Page params={route.params} />;
  return requiresMember ? <MembershipGate venueId={route.params.get("venue")}>{page}</MembershipGate> : page;
}
