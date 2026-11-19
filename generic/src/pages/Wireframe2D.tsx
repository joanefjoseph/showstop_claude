import { useState } from "react";
import TourLayout from "../components/TourLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { formatMoney } from "../api/format";
import { cachedMember, completePurchase } from "../api/purchaseFlow";
import { getSession } from "../api/purchaseSession";
import { formatMMSS, useCountdown } from "../api/useCountdown";
import { useBridgeAction } from "../api/useBridgeAction";
import { navigate, type PageProps } from "../routing";
import { findStop, GA_SECTION } from "../data/tour";

/** 2D: payment with a 5-minute hold timer. */
export default function Wireframe2D({ params }: PageProps) {
  const stop = findStop(params.get("venue"));
  const member = cachedMember();
  const cart = getSession().cart;
  const remaining = useCountdown(cart?.holdExpiresAt);
  const [method, setMethod] = useState("wallet");
  const { pendingKey, error, run } = useBridgeAction();
  const expired = !cart || remaining === 0;

  return (
    <TourLayout step={2}>
      <main className="shell narrow">
        <h1>Payment</h1>

        {expired ? (
          <div className="card">
            <h3>Your hold has expired</h3>
            <p className="muted">Tickets are only held for 5 minutes. Choose your seats again to continue.</p>
            <button className="btn primary" onClick={() => navigate(`#/2c?venue=${stop.id}`)}>Choose seats again</button>
          </div>
        ) : (
          <>
            <div className={`timer ${remaining! <= 60 ? "low" : ""}`} role="timer">
              Tickets held for <strong>{formatMMSS(remaining!)}</strong>
            </div>

            <div className="card">
              <h3>Order summary</h3>
              <p className="muted">{stop.city} · {stop.venue}</p>
              <ul className="lines">
                {cart.seats.map((s) => (
                  <li key={s.seatId} className="row between">
                    <span>{s.section === GA_SECTION || s.row === "GA" ? `${s.section} · General Admission` : `${s.section} · Row ${s.row}, Seat ${s.seatNumber}`}</span>
                    <span>{formatMoney(s.total)}</span>
                  </li>
                ))}
              </ul>
              <div className="row between muted small"><span>Subtotal</span><span>{formatMoney(cart.subtotal)}</span></div>
              <div className="row between muted small"><span>Fees</span><span>{formatMoney(cart.fees)}</span></div>
              <div className="row between total"><span>Total</span><strong>{formatMoney(cart.total)}</strong></div>
              {member && <p className="muted small">Ticket holder: {member.displayName}</p>}
            </div>

            <div className="card">
              <h3>Payment method</h3>
              {[
                ["wallet", "Saved wallet · •••• 4242"],
                ["card", "Credit / debit card"],
                ["pay", "Digital wallet"],
              ].map(([id, label]) => (
                <label key={id} className="radio">
                  <input type="radio" name="pay" checked={method === id} onChange={() => setMethod(id)} /> {label}
                </label>
              ))}
              <button
                className="btn primary wide"
                disabled={pendingKey !== null}
                onClick={() => void run("pay", completePurchase, `#/2e?venue=${stop.id}`)}
              >
                {pendingKey ? "Processing…" : `Pay ${formatMoney(cart.total)}`}
              </button>
              <BridgeErrorNote message={error} />
            </div>
          </>
        )}
      </main>
    </TourLayout>
  );
}
