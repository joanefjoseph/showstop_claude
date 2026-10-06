import WeverseCommunityLayout from "../components/WeverseCommunityLayout";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";

export default function Wireframe2D({ params }: PageProps) {
  // Venue passed through from 2C (#/2d?venue=<id>); defaults to New York / MetLife Stadium
  const venue = findVenue(params.get("venue"));
  return (
    <WeverseCommunityLayout>
      <div
        style={{
          background: "#fff",
          padding: "8px 16px",
          display: "flex",
          justifyContent: "right",
          alignItems: "center",
        }}
      >
        <div
          className="font-mono-display"
          style={{
            fontSize: 11,
            color: "var(--warn)",
            background: "rgba(255,149,0,0.15)",
            border: "1px solid var(--warn)",
            padding: "3px 10px",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ⏱ Reservation Held: 04:42
        </div>
      </div>

      <div style={{ padding: "14px 16px", background: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
          Order Summary: BTS WORLD TOUR ({venue.venue})
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            ["Seats", "Floor A1, Row A, Seats 11–12"],
            ["Fan Account", "fan@weverse.io (Verified ARMY)"],
            ["Total", "$900.00 USD (incl. taxes & fees)"],
            ["Protection", "Weverse Fan Auth + Show Stop"],
          ].map(([k, v]) => (
            <div key={k} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              <div className="font-mono-display" style={{ fontSize: 9, color: "var(--ink-muted)", marginBottom: 2 }}>
                {k}
              </div>
              <div className="font-mono-display" style={{ fontSize: 10, fontWeight: 600 }}>
                {v}
              </div>
            </div>
          ))}
        </div>

        <div className="font-mono-display" style={{ fontSize: 10, marginBottom: 8, fontWeight: 600 }}>
          Payment Method:
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {[
            { label: "● Saved Weverse Pay / Apple Pay / Google Pay", active: true },
            { label: "○ Credit / Debit Card", active: false },
          ].map((opt) => (
            /* Dead link: looks clickable (pointer cursor); the click is swallowed by the layout */
            <a
              key={opt.label}
              href="#"
              className="font-mono-display"
              style={{
                fontSize: 10,
                padding: "7px 10px",
                border: `1px solid ${opt.active ? "var(--accent)" : "var(--border)"}`,
                background: opt.active ? "#f0f5ff" : "#fff",
                borderRadius: 1,
                color: opt.active ? "var(--accent)" : "var(--ink-muted)",
              }}
            >
              {opt.label}
            </a>
          ))}
        </div>

        {/* Card input row */}
        <div
          style={{
            border: "1px solid var(--border)",
            background: "#fafaf8",
            padding: "8px 12px",
            borderRadius: 1,
            display: "flex",
            gap: 8,
            marginBottom: 14,
            alignItems: "center",
          }}
        >
          <span className="font-mono-display" style={{ fontSize: 10, color: "var(--ink-muted)", flex: 2 }}>
            4111 •••• •••• 4242
          </span>
          <span className="font-mono-display" style={{ fontSize: 10, color: "var(--ink-muted)", flex: 1 }}>
            Exp: 12/28
          </span>
          <span className="font-mono-display" style={{ fontSize: 10, color: "var(--ink-muted)", flex: 1 }}>
            CVC: •••
          </span>
        </div>
        {/* Links to 2E – wallet */}
        <a
          href={`#/2e?venue=${venue.id}`}
          style={{
            background: "var(--accent)",
            color: "#fff",
            padding: "10px 16px",
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            borderRadius: 1,
            textAlign: "center",
            display: "block",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
           💳 Complete Purchase & Issue Tickets
        </a>
        <div
          className="font-mono-display"
          style={{ fontSize: 9, color: "var(--ink-muted)", marginTop: 8, textAlign: "center" }}
        >
          🔒 Protected by Weverse Fan Authentication & Powered by Show Stop
        </div>
      </div>
    </WeverseCommunityLayout>
  );
}