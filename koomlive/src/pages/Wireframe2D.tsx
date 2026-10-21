import PurchasePageLayout from "../components/PurchasePageLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";
import { completePurchase } from "../api/purchaseFlow";
import { getSession } from "../api/purchaseSession";
import { useBridgeAction } from "../api/useBridgeAction";
import { useCountdown, formatMMSS } from "../api/useCountdown";
import { formatMoney } from "../api/format";

/* Display only: the demo billing always sends the saved wallet (see purchaseFlow.ts). */
const PAY_OPTIONS = [
  { label: "● Saved Apple Pay / Google Pay", active: true },
  { label: "○ Credit / Debit Card", active: false },
];

export default function Wireframe2D({ params }: PageProps) {
  // Show passed through from 2C (#/2d?venue=<id>)
  const venue = findVenue(params.get("venue"));
  const { member, cart } = getSession();
  const { pendingKey, error, run } = useBridgeAction();
  const remaining = useCountdown(cart?.holdExpiresAt);
  const nextHref = `#/2e?venue=${encodeURIComponent(venue.id)}`;
  const purchasing = pendingKey === "purchase";

  const seatsLabel =
    cart && cart.seats.length
      ? `${cart.seats[0].section}, Row ${cart.seats[0].row}, Seats ${cart.seats.map((s) => s.seatNumber).join(", ")}`
      : "No seats locked";
  const totalLabel = cart ? `${formatMoney(cart.total)} ${cart.total.currency} (incl. taxes & fees)` : "—";
  const memberLabel = member ? `${member.email} (@${member.membershipId})` : "Not verified";

  const summaryRows: Array<[string, string]> = [
    ["Seats", seatsLabel],
    ["Member Account", memberLabel],
    ["Total", totalLabel],
    ["Protection", "KOOM Member Auth + Show Stop"],
  ];

  const holdText =
    remaining === null
      ? "Reservation: no seats locked"
      : remaining === 0
        ? "Reservation expired — reserve seats again"
        : `Reservation held: ${formatMMSS(remaining)}`;

  return (
    <PurchasePageLayout
      venue={venue}
      step={2}
      eyebrow="STEP 2 OF 3 · CHECKOUT"
      title="Checkout"
      description="Your seats are on hold. Review your order and pay before the timer runs out."
    >
      <div className="purchase-meta">
        <span className={`hold-chip${remaining === 0 ? " is-expired" : ""}`} role="timer" aria-live="polite">
          <span aria-hidden="true">⏱</span> {holdText}
        </span>
        <span className="api-tag">PUT /carts/:id/billing · PUT /carts/:id/commit</span>
      </div>

      <div className="purchase-grid">
        <div className="purchase-panel">
          <p className="eyebrow">Your order</p>
          <h3>Order Summary</h3>
          <dl className="summary-grid">
            {summaryRows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="purchase-copy">
          <p className="eyebrow">Payment method</p>
          <div className="pay-options">
            {PAY_OPTIONS.map((opt) => (
              <div key={opt.label} className={`pay-option${opt.active ? " is-active" : ""}`} aria-current={opt.active || undefined}>
                {opt.label}
              </div>
            ))}
          </div>

          {/* Card input row (static, unused by the demo billing) */}
          <div className="card-row">
            <span>4111 •••• •••• 4242</span>
            <span>Exp 12/28</span>
            <span>CVC •••</span>
          </div>

          {/* PUT /carts/:id/billing → PUT /carts/:id/commit, then on to 2E (ticket) */}
          <button
            type="button"
            className="button button-navy is-action"
            aria-busy={purchasing}
            onClick={() => void run("purchase", completePurchase, nextHref)}
          >
            {purchasing ? "Processing payment…" : "Complete Purchase & Issue Tickets"} <span aria-hidden="true">→</span>
          </button>
          <BridgeErrorNote message={error} />

          <p className="fine-print">🔒 Protected by KOOM Member Authentication · Powered by Show Stop</p>
        </div>
      </div>
    </PurchasePageLayout>
  );
}