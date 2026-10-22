import PurchasePageLayout from "../components/PurchasePageLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";
import { completePurchase } from "../api/purchaseFlow";
import { getSession } from "../api/purchaseSession";
import { useBridgeAction } from "../api/useBridgeAction";
import { useCountdown, formatMMSS } from "../api/useCountdown";
import { formatMoney } from "../api/format";

const PAYMENT_OPTIONS = [
  { label: "Saved Apple Pay / Google Pay", active: true },
  { label: "Credit / Debit Card", active: false },
];

export default function Wireframe2D({ params }: PageProps) {
  // Stop passed through from 2C (#/2d?venue=<id>)
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
  const fanLabel = member ? `${member.email} (@${member.membershipId})` : "Not verified";

  const summaryRows: Array<[string, string]> = [
    ["Seats", seatsLabel],
    ["Fan Account", fanLabel],
    ["Total", totalLabel],
    ["Protection", "JWalkerz Fan Auth + Show Stop"],
  ];

  // Only the mm:ss digits are blue; the expired message keeps the red pill
  const holdLabel =
    remaining === null ? (
      "Reservation: no seats locked"
    ) : remaining === 0 ? (
      "Reservation expired — reserve seats again"
    ) : (
      <>
        Reservation Held: <span className="hold-time">{formatMMSS(remaining)}</span>
      </>
    );

  return (
    <PurchasePageLayout venue={venue} step={2}>
      {/* Live hold countdown */}
      <div className="hold-row">
        <div className={remaining === 0 ? "hold-pill expired" : "hold-pill"}>{holdLabel}</div>
      </div>

      <div className="purchase-body">
        <h2 className="purchase-h">Order Summary</h2>

        <div className="summary-grid">
          {summaryRows.map(([k, v]) => (
            <div key={k} className="summary-item">
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>

        <h3 className="purchase-sub">Payment Method</h3>
        <div className="pay-options">
          {/* Dead links: the demo billing always uses the saved wallet */}
          {PAYMENT_OPTIONS.map((opt) => (
            <a key={opt.label} href="#" className={opt.active ? "pay-option active" : "pay-option"}>
              {opt.label}
            </a>
          ))}
        </div>

        {/* Card input row (static, unused by the demo billing) */}
        <div className="card-row">
          <span>4111 •••• •••• 4242</span>
          <span>Exp: 12/28</span>
          <span>CVC: •••</span>
        </div>

        {/* PUT /carts/:id/billing → PUT /carts/:id/commit, then on to 2E (ticket) */}
        <div className="purchase-cta">
          <a
            className="ticket-btn"
            href={nextHref}
            aria-busy={pendingKey === "purchase"}
            onClick={(e) => {
              e.preventDefault();
              void run("purchase", completePurchase, nextHref);
            }}
          >
            {pendingKey === "purchase" ? "Processing payment…" : "Complete Purchase & Issue Tickets"}
          </a>
        </div>
        <BridgeErrorNote message={error} />

        <p className="purchase-foot">Protected by JWalkerz Fan Authentication &amp; Powered by Show Stop</p>
      </div>
    </PurchasePageLayout>
  );
}