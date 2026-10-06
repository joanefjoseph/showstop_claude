import WeverseCommunityLayout from "../components/WeverseCommunityLayout";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";
import { useEffect, useState } from "react";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { fetchMobileTicket } from "../api/purchaseFlow";
import { describeError } from "../api/bridgeClient";

export default function Wireframe2E({ params }: PageProps) {
  // Venue passed through from 2D (#/2e?venue=<id>); defaults to New York / MetLife Stadium
  const venue = findVenue(params.get("venue"));
  // GET /tickets/:ticketId — result not rendered yet (barcode below is still hard-coded)
  const [ticketError, setTicketError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchMobileTicket()
      .then((t) => {
        if (!cancelled) console.info("[2E] mobile ticket", t.ticketId, t.barcode);
      })
      .catch((err) => {
        if (!cancelled) setTicketError(describeError(err));
      });
    return () => { cancelled = true; };
  }, []);
  return (
    <WeverseCommunityLayout>
      <div style={{ padding: "14px 16px", background: "#fff" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--success)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          🎉 ORDER CONFIRMED!
          <span
            className="font-mono-display"
            style={{ fontSize: 10, color: "var(--ink-muted)", fontWeight: 400 }}
          >
            Order ID: #TM-HYBE-892104
          </span>
        </div>

        <div
          style={{
            border: "1.5px solid var(--ink)",
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: "2px 2px 0 var(--ink)",
          }}
        >
          {/* Ticket header */}
          <div style={{ background: "var(--panel-dark)", padding: "12px 14px", color: "#fff" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              BTS WORLD TOUR 'ARIRANG'
            </div>
            <div
              className="font-mono-display"
              style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}
            >
              {venue.venue} • Oct 14, 2026 • 7:30 PM
            </div>
          </div>

          {/* Seat info row */}
          <div
            style={{
              borderBottom: "1px dashed var(--border)",
              padding: "8px 14px",
              display: "flex",
              gap: 20,
            }}
          >
            {[
              ["SEC", "Floor A1"],
              ["ROW", "A"],
              ["SEAT", "11"],
            ].map(([k, v]) => (
              <div key={k}>
                <div
                  className="font-mono-display"
                  style={{ fontSize: 9, color: "var(--ink-muted)", marginBottom: 2 }}
                >
                  {k}
                </div>
                <div className="font-mono-display" style={{ fontSize: 12, fontWeight: 700 }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* Barcode area */}
          <div style={{ padding: "12px 14px", textAlign: "center" }}>
            {/* Simulated rolling barcode */}
            <div
              style={{
                border: "1px solid var(--border)",
                padding: "8px 12px",
                background: "#f8f8f8",
                marginBottom: 6,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <svg
                viewBox="0 0 300 50"
                style={{ width: "100%", height: 50 }}
                xmlns="http://www.w3.org/2000/svg"
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <rect
                    key={i}
                    x={i * 5}
                    y={0}
                    width={[2, 1, 3, 2, 1, 3, 2, 1][i % 8]}
                    height={50}
                    fill={i % 3 === 0 ? "#0047ff" : "#0a0a0a"}
                    opacity={i % 3 === 0 ? 0.7 : 1}
                  />
                ))}
              </svg>
              {/* Blue bar overlay (SafeTix animation indicator) */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 6,
                  background: "linear-gradient(90deg, #0047ff, #4488ff, #0047ff)",
                  opacity: 0.9,
                }}
              />
            </div>
            <div
              className="font-mono-display"
              style={{ fontSize: 9, color: "var(--accent)", marginBottom: 8 }}
            >
              🔵 Blue Bar Rotating (Ticketmaster SafeTix™) — Updates every 15s
            </div>
            <BridgeErrorNote message={ticketError} />

            <div
              className="font-mono-display"
              style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 10 }}
            >
              Fan: @CaratArmyStay | Verified Device ID: #iPhone16-A92B
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {/* Dead links: look clickable (pointer cursor); clicks are swallowed by the layout */}
              <a
                href="#"
                style={{
                  border: "1px solid var(--border)",
                  padding: "6px 12px",
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  borderRadius: 1,
                  cursor: "pointer",
                }}
              >
                📲 Save to Apple / Google Wallet
              </a>
              <a
                href="#"
                style={{
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  padding: "6px 12px",
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  borderRadius: 1,
                  cursor: "pointer",
                }}
              >
                🎁 View Exclusive Merch
              </a>
            </div>
          </div>
        </div>
      </div>
    </WeverseCommunityLayout>
  );
}