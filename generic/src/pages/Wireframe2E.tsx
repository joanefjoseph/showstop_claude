import { useEffect, useState } from "react";
import TourLayout from "../components/TourLayout";
import TicketBarcode from "../components/TicketBarcode";
import { describeError } from "../api/bridgeClient";
import type { MobileTicketResponse } from "../api/bridgeTypes";
import { formatEventDate, formatMoney } from "../api/format";
import { fetchMobileTicket } from "../api/purchaseFlow";
import { getSession } from "../api/purchaseSession";
import type { PageProps } from "../routing";
import { ADDONS, ARTIST, findStop, TOUR_NAME } from "../data/tour";

interface AddonState { merch: boolean; vip: number[] }

// Add-ons are simulated: kept in the browser session only, not sent to the ticketing service.
function loadAddons(orderId: string): AddonState {
  try {
    const all = JSON.parse(sessionStorage.getItem("addons") ?? "{}");
    return all[orderId] ?? { merch: false, vip: [] };
  } catch {
    return { merch: false, vip: [] };
  }
}
function saveAddons(orderId: string, state: AddonState) {
  let all: Record<string, AddonState> = {};
  try { all = JSON.parse(sessionStorage.getItem("addons") ?? "{}"); } catch { /* ignore */ }
  all[orderId] = state;
  sessionStorage.setItem("addons", JSON.stringify(all));
}

/** 2E: confirmed ticket with rotating barcode, plus post-purchase add-ons. */
export default function Wireframe2E({ params }: PageProps) {
  const stop = findStop(params.get("venue"));
  const order = getSession().order;
  const [ticketIndex, setTicketIndex] = useState(0);
  const [ticket, setTicket] = useState<MobileTicketResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addons, setAddons] = useState<AddonState>(() => (order ? loadAddons(order.orderId) : { merch: false, vip: [] }));
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    setTicket(null);
    const load = async () => {
      try {
        const t = await fetchMobileTicket(ticketIndex);
        if (cancelled) return;
        setTicket(t);
        setError(null);
        if (t.barcode.rotating && t.barcode.nextRotationAt) {
          timer = window.setTimeout(load, Math.max(500, Date.parse(t.barcode.nextRotationAt) - Date.now() + 250));
        }
      } catch (err) {
        if (cancelled) return;
        setError(describeError(err));
        timer = window.setTimeout(load, 5000);
      }
    };
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ticketIndex]);

  if (!order) {
    return (
      <TourLayout step={3}>
        <main className="shell narrow">
          <div className="card">
            <h3>No tickets yet</h3>
            <a className="btn primary" href="#/2a">Browse tour dates</a>
          </div>
        </main>
      </TourLayout>
    );
  }

  function addAddon(key: string, apply: (s: AddonState) => AddonState) {
    setBusy(key);
    window.setTimeout(() => {
      const next = apply(addons);
      saveAddons(order!.orderId, next);
      setAddons(next);
      setBusy(null);
    }, 600);
  }

  const isGA = ticket?.seat.row === "GA";
  const expiredBarcode = ticket?.barcode.rotating && ticket.barcode.nextRotationAt
    ? Date.parse(ticket.barcode.nextRotationAt) <= Date.now()
    : false;
  const hasVip = addons.vip.includes(ticketIndex);
  const addonTotal = (addons.merch ? ADDONS.merch.price : 0) + addons.vip.length * ADDONS.vip.price;

  return (
    <TourLayout step={3}>
      <main className="shell">
        <div className="confirm">
          <div className="check">✓</div>
          <h1>You're going!</h1>
          <p className="muted">Order {order.orderId} · {formatMoney(order.total)}</p>
        </div>

        <div className="split">
          <div>
            {order.ticketIds.length > 1 && (
              <div className="tabs">
                {order.ticketIds.map((id, i) => (
                  <button key={id} className={i === ticketIndex ? "on" : ""} onClick={() => setTicketIndex(i)}>
                    Ticket {i + 1}
                  </button>
                ))}
              </div>
            )}
            <div className="card ticket">
              <p className="eyebrow">{ARTIST} · {TOUR_NAME}</p>
              <h2>{stop.city} · {stop.venue}</h2>
              <p className="muted">{ticket ? formatEventDate(ticket.event.startsAt) : "Loading ticket…"}</p>
              {hasVip && <span className="badge vip">VIP</span>}
              {ticket && (
                <div className="seatgrid">
                  {isGA ? (
                    <>
                      <div><span>Type</span><strong>General Admission</strong></div>
                      <div><span>Access</span><strong>{ticket.seat.section}</strong></div>
                      <div><span>No.</span><strong>{ticket.seat.seatNumber}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>Sec</span><strong>{ticket.seat.section}</strong></div>
                      <div><span>Row</span><strong>{ticket.seat.row}</strong></div>
                      <div><span>Seat</span><strong>{ticket.seat.seatNumber}</strong></div>
                    </>
                  )}
                </div>
              )}
              {ticket && !expiredBarcode && <TicketBarcode barcode={ticket.barcode} />}
              {ticket?.barcode.rotating && (
                <p className="muted small center">
                  {expiredBarcode ? "Refreshing barcode…" : `Barcode refreshes every ${ticket.barcode.rotatesEverySeconds}s. Screenshots won't work.`}
                </p>
              )}
              {ticket && <p className="muted small center">{ticket.holderName}</p>}
              {error && <div role="alert" className="err">⚠ {error}</div>}
            </div>
          </div>

          <div className="choices">
            <h2 className="section-title">Make it a night to remember</h2>
            <article className="card addon">
              <span className="badge onsale">Ticket-holder offer</span>
              <h3>{ADDONS.merch.name}</h3>
              <p className="muted small">{ADDONS.merch.blurb}</p>
              <div className="row between">
                <span><strong>{formatMoney({ amount: ADDONS.merch.price, currency: "USD" })}</strong> <s className="muted">{formatMoney({ amount: ADDONS.merch.regular, currency: "USD" })}</s></span>
                <button
                  className="btn primary"
                  disabled={addons.merch || busy !== null}
                  onClick={() => addAddon("merch", (s) => ({ ...s, merch: true }))}
                >
                  {addons.merch ? "✓ Added" : busy === "merch" ? "Adding…" : "Add bundle"}
                </button>
              </div>
            </article>

            <article className="card addon">
              <span className="badge vip">VIP</span>
              <h3>{ADDONS.vip.name}</h3>
              <ul className="perks">
                {ADDONS.vip.perks.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <div className="row between">
                <span><strong>{formatMoney({ amount: ADDONS.vip.price, currency: "USD" })}</strong> <span className="muted small">per ticket</span></span>
                <button
                  className="btn primary"
                  disabled={hasVip || busy !== null}
                  onClick={() => addAddon("vip", (s) => ({ ...s, vip: [...s.vip, ticketIndex] }))}
                >
                  {hasVip ? "✓ Upgraded" : busy === "vip" ? "Upgrading…" : `Upgrade ticket ${ticketIndex + 1}`}
                </button>
              </div>
            </article>

            {addonTotal > 0 && (
              <div className="card summary">
                <h3>Your add-ons</h3>
                {addons.merch && <div className="row between small"><span>{ADDONS.merch.name}</span><span>{formatMoney({ amount: ADDONS.merch.price, currency: "USD" })}</span></div>}
                {addons.vip.map((i) => (
                  <div key={i} className="row between small"><span>VIP upgrade · ticket {i + 1}</span><span>{formatMoney({ amount: ADDONS.vip.price, currency: "USD" })}</span></div>
                ))}
                <div className="row between total"><span>Add-ons total</span><strong>{formatMoney({ amount: addonTotal, currency: "USD" })}</strong></div>
              </div>
            )}
            <p><a href="#/2a">← Back to tour dates</a></p>
          </div>
        </div>
      </main>
    </TourLayout>
  );
}
