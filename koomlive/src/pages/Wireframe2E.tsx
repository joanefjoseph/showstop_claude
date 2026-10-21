import { useEffect, useState } from "react";
import PurchasePageLayout from "../components/PurchasePageLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import TicketBarcode from "../components/TicketBarcode";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";
import { fetchMobileTicket } from "../api/purchaseFlow";
import { describeError } from "../api/bridgeClient";
import { formatEventDate } from "../api/format";
import type { MobileTicketResponse } from "../api/bridgeTypes";
import { useCountdown } from "../api/useCountdown";
import { getSession } from "../api/purchaseSession";
import { isGeneralAdmissionEvent } from "../api/generalAdmission";

export default function Wireframe2E({ params }: PageProps) {
  // Show passed through from 2D (#/2e?venue=<id>)
  const venue = findVenue(params.get("venue"));

  // MembershipGate only renders this page once the member is verified and cached.
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

  const rotationSecondsLeft = useCountdown(ticket?.barcode.rotating ? ticket.barcode.nextRotationAt : undefined);

  const seatRows: Array<[string, string]> =
    ticket && isGeneralAdmissionEvent(ticket.event.eventId)
      ? [
          ["ADMISSION", "General"],
          ["SEATING", "Unassigned"],
          ["TICKET NO.", ticket.seat.seatNumber],
        ]
      : [
          ["SEC", ticket?.seat.section ?? "—"],
          ["ROW", ticket?.seat.row ?? "—"],
          ["SEAT", ticket?.seat.seatNumber ?? "—"],
        ];
  // the order can now hold 1–4 tickets; the page still shows the first one (as before)
  const ticketCount = getSession().order?.ticketIds.length ?? 1;
  const eventLine = ticket
    ? `${ticket.event.venue} • ${formatEventDate(ticket.event.startsAt)}`
    : `${venue.venue} • ${venue.dateLabel}`;
  const rotationText = ticket?.barcode.rotating
    ? `Live rotating barcode — refreshes every ${ticket.barcode.rotatesEverySeconds}s` +
      (rotationSecondsLeft !== null ? ` · next in ${rotationSecondsLeft}s` : "")
    : ticket
      ? "Static barcode — does not rotate"
      : "Preparing your secure barcode…";

  return (
    <PurchasePageLayout
      venue={venue}
      step={3}
      eyebrow="STEP 3 OF 3 · YOUR TICKET"
      title="You're In"
      description={`See you at ${venue.venue} on ${venue.dateLabel}. Your mobile ticket is ready.`}
    >
      <div className="purchase-meta">
        <span className="pill pill-dark">✓ Order confirmed</span>
        <span className="api-tag">
          Ticket ID: {ticket?.ticketId ?? "…"}{ticketCount > 1 ? ` · 1 of ${ticketCount}` : ""}
        </span>
      </div>

      <div className="purchase-grid">
        <article className="ticket" aria-label={`${venue.showName} mobile ticket`}>
          <div className="ticket-head">
            <span className="pill">Night ticket</span>
            <h3>{venue.showName}</h3>
            <p className="ticket-line">{eventLine}</p>
          </div>

          <div className="ticket-seats">
            {seatRows.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
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
            <p className="ticket-note is-accent">{rotationText}</p>
            {ticket && (
              <p className="ticket-value">
                {ticket.barcode.format} · {ticket.barcode.value}
              </p>
            )}
            <BridgeErrorNote message={ticketError} />
            <p className="ticket-note">Member: {handle} | Verified Device ID: #iPhone16-A92B</p>
            <div className="ticket-actions">
              <button type="button" className="button button-light">Save to Apple / Google Wallet</button>
              <button type="button" className="button button-pink">View Excl. Merch</button>
            </div>
          </div>
        </article>

        <div className="purchase-copy">
          <div>
            <p className="eyebrow">Order confirmed</p>
            <h3>See you on the floor.</h3>
          </div>
          <p className="copy">
            Show this barcode at the door. It refreshes automatically while this page is open, so keep it
            on screen when you reach the scanner.
          </p>
          <div className="venue-block">
            <span className="pill pill-dark">Venue</span>
            <div>
              <strong className="venue-name">{venue.venue}</strong>
              <p className="copy">{venue.address}</p>
            </div>
          </div>
          <a href="#/2b" className="button button-navy is-action">
            Back to KOOM Live <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </PurchasePageLayout>
  );
}