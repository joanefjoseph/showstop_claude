import type { ReactNode } from "react";
import TourLayout from "./TourLayout";
import { IMG } from "../assets";
import { t, useLang } from "../i18n";
import { dateLabel, type TourVenue } from "../data/tourVenues";

const STEPS = ["Seats", "Checkout", "Ticket"];

/**
 * Page shell for 2C–2E: the tour chrome around a centred card, headed by the
 * stop picked on 2B (same row as its 2B listing) and a three-step indicator.
 */
export default function PurchasePageLayout({
  venue,
  step,
  children,
}: {
  venue: TourVenue;
  /** 1 = seats (2C), 2 = checkout (2D), 3 = ticket (2E) */
  step: 1 | 2 | 3;
  children: ReactNode;
}) {
  const lang = useLang();

  return (
    <TourLayout
      title={`Tickets: ${venue.city} · ${dateLabel(venue)} | Jay Park World Tour`}
      showLanguageToggle={false}
      topbarStart={
        <a href="#tour" className="back-link">
          ← {t(lang, "tour_title")}
        </a>
      }
    >
      <section className="purchase wrap">
        <a href="#/2b" className="purchase-logo-link" aria-label="Back to the tour page">
          <img
            className="purchase-logo"
            src={IMG.logo}
            alt="Jay Park 2026 World Tour with LNGSHOT. Serenades & Body Rolls."
          />
        </a>

        <div className="purchase-panel">
          <div className="stop purchase-event">
            <div className="date">{venue.date}</div>
            <div>
              <div className="city">{venue.city}</div>
              <div className="venue">{venue.venue}</div>
            </div>
          </div>

          <ol className="purchase-steps">
            {STEPS.map((label, i) => (
              <li key={label} aria-current={i + 1 === step ? "step" : undefined}>
                {i + 1}. {label}
              </li>
            ))}
          </ol>

          {children}
        </div>
      </section>
    </TourLayout>
  );
}