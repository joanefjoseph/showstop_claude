import type { ReactNode } from "react";
import logo from "../assets/logo.jpg";
import { ARTIST, TOUR_NAME, TOUR_YEAR, FAN_CLUB } from "../data/tour";

const STEPS = ["Seats", "Payment", "Tickets"] as const;

/** Page chrome: header, optional step tracker (2C to 2E), footer. All non-tour links are placeholders. */
export default function TourLayout({ step, children }: { step?: 1 | 2 | 3; children: ReactNode }) {
  return (
    <div className="page">
      <header className="topbar">
        <a href="#/2a" className="brand">
          <img className="brand-logo" src={logo} alt={ARTIST} />
        </a>
        <nav aria-label="Primary">
          <a href="#/2a">Tour</a>
          <a href="#" onClick={(e) => e.preventDefault()}>{FAN_CLUB}</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Merch</a>
        </nav>
      </header>

      {step && (
        <ol className="steps" aria-label="Purchase progress">
          {STEPS.map((label, i) => (
            <li key={label} className={i + 1 === step ? "on" : i + 1 < step ? "done" : ""}>
              <span>{i + 1 < step ? "✓" : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      )}

      {children}

      <footer className="foot">
        © {TOUR_YEAR} {ARTIST}. All rights reserved.
      </footer>
    </div>
  );
}
