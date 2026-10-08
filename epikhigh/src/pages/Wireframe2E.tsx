import { useEffect, useState } from "react";
import TourPageLayout from "../components/TourPageLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";
import { fetchMobileTicket } from "../api/purchaseFlow";
import { describeError } from "../api/bridgeClient";
import { formatEventDate } from "../api/format";
import type { MobileTicketResponse } from "../api/bridgeTypes";
import TicketBarcode from "../components/TicketBarcode";
import { useCountdown } from "../api/useCountdown";

export default function Wireframe2E({ params }: PageProps) {
  // Venue passed through from 2D (#/2e?venue=<id>); defaults to New York / MetLife Stadium
  const venue = findVenue(params.get("venue"));

  // GET /tickets/:ticketId — the bridge derives a fresh rotating value on every call,
  // so re-fetch just after each nextRotationAt to keep the barcode current.
  const [ticket, setTicket] = useState<MobileTicketResponse | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let hadTicket = false;

    const load = async () => {
      try {
        const t = await fetchMobileTicket();
        if (cancelled) return;
        hadTicket = true;
        setTicket(t);
        setTicketError(null);
        if (t.barcode.rotating && t.barcode.nextRotationAt) {
          // +250 ms so we land in the new window; min 1 s guards against client/server clock skew
          const delay = Math.max(1000, Date.parse(t.barcode.nextRotationAt) - Date.now() + 250);
          timer = window.setTimeout(load, delay);
        }
      } catch (err) {
        if (cancelled) return;
        setTicketError(describeError(err));
        // A refresh failed after we already showed a ticket → keep trying; first-load failures stop here
        if (hadTicket) timer = window.setTimeout(load, 5000);
      }
    };

    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const rotationSecondsLeft = useCountdown(
    ticket?.barcode.rotating ? ticket.barcode.nextRotationAt : undefined,
  );

  const seatRows: Array<[string, string]> = [
    ["SEC", ticket?.seat.section ?? "—"],
    ["ROW", ticket?.seat.row ?? "—"],
    ["SEAT", ticket?.seat.seatNumber ?? "—"],
  ];
  const eventLine = ticket
    ? `${ticket.event.venue} • ${formatEventDate(ticket.event.startsAt)}`
    : venue.venue;

  return (
    <TourPageLayout>
      <div style={{ padding: "14px 16px", background: "#fff" }}>
        {/* Confirmation banner — shows the ticket ID attached to the barcode */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--success)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          🎉 ORDER CONFIRMED!
          <span className="font-mono-display" style={{ fontSize: 10, color: "var(--ink-muted)", fontWeight: 400 }}>
            Ticket ID: {ticket?.ticketId ?? "…"}
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
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>EPIK HIGH North America Tour '3.0'</div>
            <div className="font-mono-display" style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
              {eventLine}
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
            {seatRows.map(([k, v]) => (
              <div key={k}>
                <div className="font-mono-display" style={{ fontSize: 9, color: "var(--ink-muted)", marginBottom: 2 }}>
                  {k}
                </div>
                <div className="font-mono-display" style={{ fontSize: 12, fontWeight: 700 }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* Barcode area — real barcode from GET /tickets/:ticketId */}
          <div style={{ padding: "12px 14px", textAlign: "center" }}>
            {ticket ? (
              <TicketBarcode barcode={ticket.barcode} />
            ) : (
              <div
                className="font-mono-display"
                style={{
                  border: "1px solid var(--border)",
                  padding: "22px 12px",
                  background: "#f8f8f8",
                  marginBottom: 6,
                  fontSize: 10,
                  color: "var(--ink-muted)",
                }}
              >
                {ticketError ? "Barcode unavailable" : "Loading secure barcode…"}
              </div>
            )}

            <div className="font-mono-display" style={{ fontSize: 9, color: "var(--accent)", marginBottom: 4 }}>
              {ticket?.barcode.rotating
                ? `🔵 Blue Bar Rotating (Ticketmaster SafeTix™) — Updates every ${ticket.barcode.rotatesEverySeconds}s` +
                  (rotationSecondsLeft !== null ? ` · next in ${rotationSecondsLeft}s` : "")
                : ticket
                  ? "Static barcode — does not rotate"
                  : "🔵 Blue Bar Rotating (Ticketmaster SafeTix™)"}
            </div>
            {ticket && (
              <div
                className="font-mono-display"
                style={{ fontSize: 8, color: "var(--ink-muted)", marginBottom: 8, wordBreak: "break-all" }}
              >
                {ticket.barcode.format} · {ticket.barcode.value}
              </div>
            )}
            <BridgeErrorNote message={ticketError} />

            <div className="font-mono-display" style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 10 }}>
              Fan: @CaratArmyStay | Verified Device ID: #iPhone16-A92B
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
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
    </TourPageLayout>
  );
}