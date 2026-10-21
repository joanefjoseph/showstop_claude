import type { ReactNode } from "react";
import KoomLayout from "./KoomLayout";
import type { TourVenue } from "../data/tourVenues";

const STEPS = ["Seats", "Checkout", "Ticket"] as const;

interface PurchasePageLayoutProps {
  venue: TourVenue;
  /** 1 = seats (2C), 2 = checkout (2D), 3 = ticket (2E) */
  step: 1 | 2 | 3;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * Page shell for 2C–2E: the landing page's intro band (navy heading + pink fact strip),
 * then a paper section holding a progress tracker and a lavender card with the step's content.
 */
export default function PurchasePageLayout({ venue, step, eyebrow, title, description, children }: PurchasePageLayoutProps) {
  return (
    <KoomLayout title={`Tickets: ${venue.showName} — KOOM Week 2026`}>
      <section className="intro purchase-intro">
        <div className="intro-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <div className="intro-details">
          <p className="intro-description">{description}</p>
          <div className="fact"><span>LOCATION</span><strong>{venue.venue}</strong></div>
          <div className="fact"><span>DATE</span><strong>{venue.dateLabel}</strong></div>
        </div>
      </section>

      <section className="purchase-section">
        <div className="section-inner">
          <ol className="purchase-steps" aria-label="Purchase progress">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const state = n < step ? "is-done" : n === step ? "is-current" : "";
              return (
                <li key={label} className={state} aria-current={n === step ? "step" : undefined}>
                  <span>{String(n).padStart(2, "0")}</span>
                  {label}
                </li>
              );
            })}
          </ol>
          <div className="purchase-card">{children}</div>
        </div>
      </section>
    </KoomLayout>
  );
}