import type { ReactNode } from "react";
import ComedyLayout from "./ComedyLayout";
import type { TourVenue } from "../data/tourVenues";

/**
 * Page shell for 2C–2E: the 2B navbar and footer around a centred panel,
 * headed by the show picked on 2B (same row as its 2B listing).
 */
export default function PurchasePageLayout({ venue, children }: { venue: TourVenue; children: ReactNode }) {
  return (
    <ComedyLayout title={`Tickets: ${venue.showName} | David Jin`}>
      <main className="purchase-main">
        <div className="purchase-panel">
          <div className="purchase-event">
            <span className="tour-date">{venue.dateLabel}</span>
            <div className="tour-venue">
              {venue.showName}
              <span className="tour-city">{venue.venue} · {venue.city}, {venue.region}</span>
            </div>
          </div>
          {children}
        </div>
      </main>
    </ComedyLayout>
  );
}