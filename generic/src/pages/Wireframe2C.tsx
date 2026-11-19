import { useCallback, useEffect, useMemo, useState } from "react";
import TourLayout from "../components/TourLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { SeatMap } from "../components/SeatMap";
import { BridgeError } from "../api/bridgeClient";
import type { EventAvailabilityResponse } from "../api/bridgeTypes";
import { formatEventDate, formatMoney } from "../api/format";
import { cachedMember, loadAvailability, lockSeats, lockTickets } from "../api/purchaseFlow";
import { buildSeatOptions } from "../api/seatOptions";
import { useBridgeAction } from "../api/useBridgeAction";
import type { PageProps } from "../routing";
import { findStop, GA_MAX_PER_ORDER, GA_SECTION } from "../data/tour";

type Choice = { kind: "ga" } | { kind: "seats"; optionId: string };

/** 2C: pick Floor (general admission) tickets or a pair of reserved seats in Club / Lower Bowl. */
export default function Wireframe2C({ params }: PageProps) {
  const stop = findStop(params.get("venue"));
  const member = cachedMember();
  const [avail, setAvail] = useState<EventAvailabilityResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choice, setChoice] = useState<Choice>({ kind: "ga" });
  const [qty, setQty] = useState(2);
  const { pendingKey, error, run } = useBridgeAction();
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setAvail(await loadAvailability(stop.id));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load availability");
    }
  }, [stop.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const options = useMemo(() => (avail ? buildSeatOptions(avail) : []), [avail]);
  const floor = avail?.sections.find((s) => s.section === GA_SECTION);
  const maxQty = Math.max(0, Math.min(GA_MAX_PER_ORDER, floor?.availableCount ?? 0, member?.maxTicketsPerOrder ?? GA_MAX_PER_ORDER));
  const quantity = Math.min(qty, Math.max(1, maxQty));
  const chosen = choice.kind === "seats" ? options.find((o) => o.id === choice.optionId) : undefined;
  const floorPrice = floor?.priceRange?.min;

  const total =
    choice.kind === "ga"
      ? floorPrice && { amount: floorPrice.amount * quantity, currency: floorPrice.currency }
      : chosen && { amount: chosen.pricePerSeat.amount * 2, currency: chosen.pricePerSeat.currency };

  function reserve() {
    setNotice(null);
    const action =
      choice.kind === "ga"
        ? () => lockTickets(stop.id, GA_SECTION, quantity)
        : () => {
            if (!chosen) throw new Error("Pick a seat option first");
            return lockSeats(stop.id, chosen.seatIds);
          };
    void run("reserve", async () => {
      try {
        await action();
      } catch (err) {
        if (err instanceof BridgeError && err.status === 409) {
          await refresh();
          setNotice("Those tickets were just taken. We've refreshed availability, so please choose again.");
        }
        throw err;
      }
    }, `#/2d?venue=${stop.id}`);
  }

  return (
    <TourLayout step={1}>
      <main className="shell">
        <div className="row between">
          <div>
            <h1>{stop.city} · {stop.venue}</h1>
            <p className="muted">{avail ? formatEventDate(avail.startsAt) : "Loading…"}</p>
          </div>
          <div className="right">
            <span className={`badge ${stop.saleType === "PRESALE" ? "presale" : "onsale"}`}>
              {stop.saleType === "PRESALE" ? "Presale" : "On sale"}
            </span>
            {member && <p className="muted small">{member.displayName} · {member.tierName}</p>}
          </div>
        </div>

        {loadError && <BridgeErrorNote message={loadError} />}

        {avail && (
          <div className="split">
            <div className="card map-card">
              <SeatMap
                sections={avail.sections}
                selectedSection={choice.kind === "ga" ? GA_SECTION : chosen?.section}
              />
            </div>

            <div className="choices">
              <article
                className={`card choice ${choice.kind === "ga" ? "sel" : ""}`}
                onClick={() => setChoice({ kind: "ga" })}
              >
                <div className="row between">
                  <h3>Floor · General Admission</h3>
                  <strong>{floorPrice ? formatMoney(floorPrice) : "—"}</strong>
                </div>
                <p className="muted small">Standing, closest to the stage · {floor?.availableCount ?? 0} left · price per ticket incl. fees</p>
                <div className="stepper">
                  <button type="button" disabled={quantity <= 1} onClick={(e) => { e.stopPropagation(); setChoice({ kind: "ga" }); setQty(quantity - 1); }}>−</button>
                  <span>{quantity}</span>
                  <button type="button" disabled={quantity >= maxQty} onClick={(e) => { e.stopPropagation(); setChoice({ kind: "ga" }); setQty(quantity + 1); }}>+</button>
                </div>
              </article>

              {options.map((o) => (
                <article
                  key={o.id}
                  className={`card choice ${choice.kind === "seats" && choice.optionId === o.id ? "sel" : ""}`}
                  onClick={() => setChoice({ kind: "seats", optionId: o.id })}
                >
                  <div className="row between">
                    <h3>{o.section} · Reserved</h3>
                    <strong>{formatMoney(o.pricePerSeat)}</strong>
                  </div>
                  <p className="muted small">
                    Row {o.row} · seats {o.seatLabels.join(" & ")} together · per ticket incl. fees
                  </p>
                </article>
              ))}

              <div className="card summary">
                <div className="row between">
                  <span>Estimated total</span>
                  <strong>{total ? formatMoney(total) : "—"}</strong>
                </div>
                <button
                  className="btn primary wide"
                  onClick={reserve}
                  disabled={pendingKey !== null || !total || (choice.kind === "ga" && maxQty === 0)}
                >
                  {pendingKey ? "Reserving…" : "Reserve & continue"}
                </button>
                <p className="muted small">Your tickets are held for 5 minutes while you pay.</p>
                {notice && <div role="alert" className="err">{notice}</div>}
                <BridgeErrorNote message={error} />
              </div>
            </div>
          </div>
        )}
      </main>
    </TourLayout>
  );
}
