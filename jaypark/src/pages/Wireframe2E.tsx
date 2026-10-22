import { useEffect, useState } from "react";
import PurchasePageLayout from "../components/PurchasePageLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import TicketBarcode from "../components/TicketBarcode";
import { dateLabel, findVenue, TOUR_NAME } from "../data/tourVenues";
import type { PageProps } from "../routing";
import { fetchMobileTicket } from "../api/purchaseFlow";
import { describeError } from "../api/bridgeClient";
import { formatEventDate } from "../api/format";
import type { MobileTicketResponse } from "../api/bridgeTypes";
import { useCountdown } from "../api/useCountdown";
import { getSession } from "../api/purchaseSession";

export default function Wireframe2E({ params }: PageProps) {
  // Stop passed through from 2D (#/2e?venue=<id>)
  const venue = findVenue(params.get("venue"));

  // Logged-in member's handle. MembershipGate only renders this page once the
  // member is verified and cached in the session.
  const member = getSession().member;
  const handle = member ? `@${member.membershipId}` : "unverified";

  // GET /tickets/:ticketId: the bridge derives a fresh rotating value on every call,
  // so re-fetch just after each nextRotationAt to keep the barcode current.
  const [ticket, setTicket] = useState<MobileTicketResponse | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let hadTicket = false;

    const load = async () => {
      try {
        const next = await fetchMobileTicket();
        if (cancelled) return;
        hadTicket = true;
        setTicket(next);
        setTicketError(null);
        if (next.barcode.rotating && next.barcode.nextRotationAt) {
          // +250 ms so we land in the new window; min 1 s guards against client/server clock skew
          const delay = Math.max(1000, Date.parse(next.barcode.nextRotationAt) - Date.now() + 250);
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
    ? `${venue.city} • ${ticket.event.venue} • ${formatEventDate(ticket.event.startsAt)}`
    : `${venue.city} • ${venue.venue} • ${dateLabel(venue)}`;

  const barcodeStatus = ticket?.barcode.rotating
    ? `Rotating barcode — updates every ${ticket.barcode.rotatesEverySeconds}s` +
      (rotationSecondsLeft !== null ? ` · next in ${rotationSecondsLeft}s` : "")
    : ticket
      ? "Static barcode — does not rotate"
      : "Rotating barcode";

  return (
    <PurchasePageLayout venue={venue} step={3}>
      <div className="purchase-body">
        {/* Confirmation banner: shows the ticket ID attached to the barcode */}
        <div className="confirm">
          <h2 className="purchase-h">Order Confirmed!</h2>
          <span className="ticket-id">Ticket ID: {ticket?.ticketId ?? "…"}</span>
        </div>

        <div className="ticket-card">
          {/* Ticket header */}
          <div className="ticket-head">
            <div className="name">{TOUR_NAME}</div>
            <div className="line">{eventLine}</div>
          </div>

          {/* Seat info row */}
          <div className="ticket-seat">
            {seatRows.map(([k, v]) => (
              <div key={k}>
                <div className="k">{k}</div>
                <div className="v">{v}</div>
              </div>
            ))}
          </div>

          {/* Barcode area: real barcode from GET /tickets/:ticketId */}
          <div className="ticket-body">
            {ticket ? (
              <TicketBarcode barcode={ticket.barcode} />
            ) : (
              <div className="barcode-placeholder">
                {ticketError ? "Barcode unavailable" : "Loading secure barcode…"}
              </div>
            )}

            <div className="barcode-status">{barcodeStatus}</div>
            {ticket && (
              <div className="barcode-value">
                {ticket.barcode.format} · {ticket.barcode.value}
              </div>
            )}
            <BridgeErrorNote message={ticketError} />

            <p className="ticket-fan">Fan: {handle} | Verified Device ID: #iPhone16-A92B</p>

            {/* Dead links */}
            <div className="ticket-actions">
              <a href="#" className="pill-btn">Save to Apple / Google Wallet</a>
              <a href="#" className="pill-btn solid">View Exclusive Merch</a>
            </div>
          </div>
        </div>
      </div>
    </PurchasePageLayout>
  );
}