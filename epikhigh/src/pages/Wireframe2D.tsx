import TourPageLayout from "../components/TourPageLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";
import { completePurchase } from "../api/purchaseFlow";
import { getSession } from "../api/purchaseSession";
import { useBridgeAction } from "../api/useBridgeAction";
import { useCountdown, formatMMSS } from "../api/useCountdown";
import { formatMoney } from "../api/format";

export default function Wireframe2D({ params }: PageProps) {
  // Venue passed through from 2C (#/2d?venue=<id>); defaults to New York / MetLife Stadium
  const venue = findVenue(params.get("venue"));
  const { member, cart } = getSession();
  const { pendingKey, error, run } = useBridgeAction();
  const remaining = useCountdown(cart?.holdExpiresAt);
  const nextHref = `#/2e?venue=${venue.id}`;

  const seatsLabel =
    cart && cart.seats.length
      ? `${cart.seats[0].section}, Row ${cart.seats[0].row}, Seats ${cart.seats.map((s) => s.seatNumber).join(", ")}`
      : "No seats locked";
  const totalLabel = cart
    ? `${formatMoney(cart.total)} ${cart.total.currency} (incl. taxes & fees)`
    : "—";
  const fanLabel = member ? `${member.email} (Verified ${member.tierName})` : "Not verified";

  const summaryRows: Array<[string, string]> = [
    ["Seats", seatsLabel],
    ["Fan Account", fanLabel],
    ["Total", totalLabel],
    ["Protection", "Weverse Fan Auth + Show Stop"],
  ];

  const holdText =
    remaining === null
      ? "Reservation: no seats locked"
      : remaining === 0
        ? "Reservation expired — reserve seats again"
        : `Reservation Held: ${formatMMSS(remaining)}`;

  return (
    <TourPageLayout>
      {/* Live hold countdown */}
      <div style={{ background: "#fff", padding: "8px 16px", display: "flex", justifyContent: "right", alignItems: "center" }}>
        <div
          className="font-mono-display"
          style={{
            fontSize: 11,
            color: remaining === 0 ? "#b3261e" : "var(--warn)",
            background: "rgba(255,149,0,0.15)",
            border: `1px solid ${remaining === 0 ? "#b3261e" : "var(--warn)"}`,
            padding: "3px 10px",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ⏱ {holdText}
        </div>
      </div>

      <div style={{ padding: "14px 16px", background: "#fff" }}>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.25, marginBottom: 12 }}>
          Order Summary: EPIK HIGH North America Tour ({venue.venue})
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {summaryRows.map(([k, v]) => (
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

        {/* Card input row (static, unused by the demo billing) */}
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

        {/* PUT /carts/:id/billing → PUT /carts/:id/commit, then on to 2E — wallet */}
        <a
          href={nextHref}
          onClick={(e) => {
            e.preventDefault();
            void run("purchase", completePurchase, nextHref);
          }}
          aria-busy={pendingKey === "purchase"}
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
            cursor: pendingKey ? "wait" : "pointer",
            opacity: pendingKey ? 0.7 : 1,
          }}
        >
          💳 {pendingKey === "purchase" ? "Processing payment…" : "Complete Purchase & Issue Tickets"}
        </a>
        <BridgeErrorNote message={error} />

        <div
          className="font-mono-display"
          style={{ fontSize: 9, color: "var(--ink-muted)", marginTop: 8, textAlign: "center" }}
        >
          🔒 Protected by Weverse Fan Authentication & Powered by Show Stop
        </div>
      </div>
    </TourPageLayout>
  );
}