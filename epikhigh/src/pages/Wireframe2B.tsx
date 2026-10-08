import { useEffect, type MouseEvent } from "react";
import TopNav from "../components/TopNav";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { TOUR_VENUES } from "../data/tourVenues";
import { loadAvailability } from "../api/purchaseFlow";
import { useBridgeAction } from "../api/useBridgeAction";
import "../components/TourDatesLayout.css";

/* The downloaded page's images/IMG_7963.PNG, copied to public/images/ (respects Vite's base URL). */
const POSTER = `${import.meta.env.BASE_URL}images/IMG_7963.PNG`;

const PAGE_TITLE = "2026 NORTH AMERICA TOUR | EPIK HIGH";

/** Both buttons in a row do the same thing (load availability, then go to 2C for that stop). */
const ROW_ACTIONS = [
  { key: "buy", label: "Buy Tickets" },
  { key: "vip", label: "VIP Upgrade" },
] as const;

/** "VIP PACKAGE INFO" and "Back to HQ" are dead links (href="#"). In this
 *  hash-routed app "#" would jump to #/2a, so those clicks are swallowed. */
function swallowDeadLinks(e: MouseEvent<HTMLDivElement>) {
  const link = (e.target as HTMLElement).closest("a");
  if (link?.getAttribute("href") === "#") e.preventDefault();
}

export default function Wireframe2B() {
  // <title> of the original page; restored when navigating to another wireframe.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const { pendingKey, error, run } = useBridgeAction();

  return (
    <div className="td-page" onClick={swallowDeadLinks}>
      <TopNav />

      <main className="td-container">
        <section className="page-section">
          <div className="fluid-engine fe-main-grid">
            {/* Main Tour Image */}
            <div className="fe-block fe-block-image">
              <img src={POSTER} alt="2026 North America Tour Poster" />
            </div>

            {/* VIP button ("GA ➟ VIP 2 UPGRADE" removed) */}
            <div className="fe-block fe-block-vip">
              <a href="#" className="sqs-block-button-element">VIP PACKAGE INFO</a>
            </div>

            {/* Tour Dates: stop info on the left, two actions on the right */}
            <div className="fe-block fe-block-dates">
              <BridgeErrorNote message={error} />
              <ul className="tour-dates">
                {TOUR_VENUES.map((v) => {
                  // GET /events/<venue id>/availability, then on to 2C (seat selection for this stop)
                  const href = `#/2c?venue=${v.id}`;
                  return (
                    <li key={v.id} className="tour-date-row">
                      <span className="tour-date-label">
                        {v.listName} | {v.dateLabel}
                      </span>
                      <div className="tour-date-actions">
                        {ROW_ACTIONS.map((a) => {
                          const key = `${v.id}:${a.key}`;
                          const isPending = pendingKey === key;
                          return (
                            <a
                              key={a.key}
                              href={href}
                              onClick={(e) => {
                                e.preventDefault();
                                void run(key, () => loadAvailability(v.id), href);
                              }}
                              aria-busy={isPending}
                              className="sqs-block-button-element"
                              style={{
                                cursor: pendingKey ? "wait" : "pointer",
                                opacity: pendingKey && !isPending ? 0.5 : 1,
                              }}
                            >
                              {isPending ? "Checking seats…" : a.label}
                            </a>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <section className="page-section footer-section">
          <div className="fluid-engine fe-footer-grid">
            <div className="fe-block fe-block-back">
              <a href="#" className="sqs-block-button-element tertiary">← Back to HQ</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}