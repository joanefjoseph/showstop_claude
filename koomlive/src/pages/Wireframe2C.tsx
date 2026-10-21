import { useEffect, useMemo, useState } from "react";
import PurchasePageLayout from "../components/PurchasePageLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { findVenue } from "../data/tourVenues";
import { DEFAULT_TICKET_SECTION } from "../data/ticketTypes";
import type { PageProps } from "../routing";
import { loadAvailability, lockSeats, lockTickets } from "../api/purchaseFlow";
import { BridgeError, describeError } from "../api/bridgeClient";
import { buildSeatOptions, optionTitle } from "../api/seatOptions";
import {
  GA_DEFAULT_QUANTITY,
  GA_MAX_PER_ORDER,
  gaOptions,
  isGeneralAdmission,
  type GaOption,
} from "../api/generalAdmission";
import { formatMoney } from "../api/format";
import { getSession } from "../api/purchaseSession";
import { useBridgeAction } from "../api/useBridgeAction";
import type { EventAvailabilityResponse, SectionAvailability } from "../api/bridgeTypes";

type Pt = [number, number];
type Tier = "floor" | "lower" | "upper";

const BAND = 24; // thickness of each U
/* KOOM palette: lavender shades for sections, navy stage, pink for the selected section */
const FILL: Record<Tier, string> = { floor: "#b9c3e4", lower: "#cfd6ed", upper: "#e1e6f4" };
const NAVY = "#0a0d36";
const PINK = "#f091ff";
const LABEL = "#3b3f6b";
const MAP_FONT = "'DM Mono', monospace";

/* Assigned-seat geometry (viewBox units). Stage at the top, everything centred on x = 150. */
const STAGE = { x: 110, y: 8, w: 80, h: 18 };
const FLOOR = { x: 110, y: 34, w: 80, h: 60 };
const INNER_U: Pt[] = [[92, 8], [92, 112], [208, 112], [208, 8]];
const OUTER_U: Pt[] = [[62, 8], [62, 142], [238, 142], [238, 8]];

/* General-admission geometry: a wide stage with the standing floor in front of it. */
const GA_STAGE = { x: 70, y: 10, w: 160, h: 20 };
const GA_FLOOR = { x: 70, y: 38, w: 160, h: 112 };

/** The bridge sends each seat's price-level name as price.level ("Floor A1", "Lower Bowl", "Club"). */
function levelOf(s: SectionAvailability): string {
  return (s.seats[0]?.price.level ?? s.section).toLowerCase();
}

/** "floor" levels sit in front of the stage, "lower" levels form the inner U, everything else the outer U. */
function groupByTier(sections: SectionAvailability[]): Record<Tier, SectionAvailability[]> {
  const tiers: Record<Tier, SectionAvailability[]> = { floor: [], lower: [], upper: [] };
  for (const s of sections) {
    const level = levelOf(s);
    tiers[level.includes("floor") ? "floor" : level.includes("lower") ? "lower" : "upper"].push(s);
  }
  return tiers;
}

/** Cuts a polyline into n equal-length pieces (small gap between neighbours), one per section. */
function splitPolyline(points: Pt[], n: number, gap = 3) {
  const segLens = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = segLens.reduce((a, b) => a + b, 0);

  const at = (dist: number): { pt: Pt; vertical: boolean } => {
    let d = dist;
    for (let i = 0; i < segLens.length; i++) {
      if (d <= segLens[i] || i === segLens.length - 1) {
        const a = points[i];
        const b = points[i + 1];
        const t = segLens[i] ? d / segLens[i] : 0;
        return { pt: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], vertical: a[0] === b[0] };
      }
      d -= segLens[i];
    }
    return { pt: points[0], vertical: false };
  };

  return Array.from({ length: n }, (_, i) => {
    const start = (total * i) / n + (i > 0 ? gap / 2 : 0);
    const end = (total * (i + 1)) / n - (i < n - 1 ? gap / 2 : 0);
    const corners: Pt[] = [];
    let run = 0;
    for (let k = 0; k < segLens.length - 1; k++) {
      run += segLens[k];
      if (run > start && run < end) corners.push(points[k + 1]);
    }
    const path = [at(start).pt, ...corners, at(end).pt];
    return {
      d: path.map(([x, y], k) => `${k ? "L" : "M"}${x} ${y}`).join(" "),
      mid: at((start + end) / 2),
    };
  });
}

/** Assigned seating: floor block in front of the stage, lower and upper levels as two U's around it. */
function SeatMap({ sections, selectedSection }: { sections: SectionAvailability[]; selectedSection?: string }) {
  const tiers = groupByTier(sections);
  const label = (s: SectionAvailability) => `${s.section} · ${s.availableCount} left`;
  const textProps = {
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontSize: 6,
    fontFamily: MAP_FONT,
  };

  const ring = (tier: "lower" | "upper", line: Pt[]) =>
    splitPolyline(line, tiers[tier].length).map(({ d, mid }, i) => {
      const s = tiers[tier][i];
      const active = s.section === selectedSection;
      const [x, y] = mid.pt;
      return (
        <g key={s.section}>
          <path d={d} fill="none" stroke={active ? PINK : FILL[tier]} strokeWidth={BAND} strokeLinejoin="round" />
          <text
            {...textProps}
            x={x}
            y={y}
            fill={active ? NAVY : LABEL}
            transform={mid.vertical ? `rotate(-90 ${x} ${y})` : undefined}
          >
            {label(s)}
          </text>
        </g>
      );
    });

  const floorCount = tiers.floor.length;
  const floorW = floorCount ? (FLOOR.w - 3 * (floorCount - 1)) / floorCount : 0;

  return (
    <svg viewBox="44 0 212 162" role="img" aria-label="Seat map" className="seat-map">
      <rect x={44} y={0} width={212} height={162} fill="#ffffff" />
      <rect x={STAGE.x} y={STAGE.y} width={STAGE.w} height={STAGE.h} rx={3} fill={NAVY} />
      <text {...textProps} x={150} y={STAGE.y + STAGE.h / 2} fill={PINK}>STAGE</text>

      {tiers.floor.map((s, i) => {
        const active = s.section === selectedSection;
        const x = FLOOR.x + i * (floorW + 3);
        return (
          <g key={s.section}>
            <rect x={x} y={FLOOR.y} width={floorW} height={FLOOR.h} rx={3} fill={active ? PINK : FILL.floor} />
            <text {...textProps} x={x + floorW / 2} y={FLOOR.y + FLOOR.h / 2} fill={active ? NAVY : LABEL}>
              {label(s)}
            </text>
          </g>
        );
      })}

      {ring("lower", INNER_U)}
      {ring("upper", OUTER_U)}
    </svg>
  );
}

/**
 * General admission: the stage and the standing floor in front of it. Grayed out when the
 * selected ticket doesn't include the concert (Daytime Only).
 */
function GaMap({ muted }: { muted: boolean }) {
  const midY = GA_FLOOR.y + GA_FLOOR.h / 2;
  const textProps = { textAnchor: "middle" as const, dominantBaseline: "central" as const, fontFamily: MAP_FONT };
  return (
    <svg
      viewBox="44 0 212 162"
      role="img"
      aria-label={
        muted
          ? "Concert stage map (not included with the selected ticket)"
          : "Concert stage map: general-admission standing floor in front of the stage"
      }
      className={muted ? "seat-map is-muted" : "seat-map"}
    >
      <rect x={44} y={0} width={212} height={162} fill="#ffffff" />
      <rect x={GA_STAGE.x} y={GA_STAGE.y} width={GA_STAGE.w} height={GA_STAGE.h} rx={3} fill={NAVY} />
      <text {...textProps} x={150} y={GA_STAGE.y + GA_STAGE.h / 2} fontSize={6} fill={PINK}>STAGE</text>

      <rect x={GA_FLOOR.x} y={GA_FLOOR.y} width={GA_FLOOR.w} height={GA_FLOOR.h} rx={4} fill={PINK} />
      <text {...textProps} x={150} y={midY - 7} fontSize={9} fontWeight={700} fill={NAVY}>GA FLOOR</text>
      <text {...textProps} x={150} y={midY + 7} fontSize={6} fill={NAVY}>Standing · no assigned spots</text>
    </svg>
  );
}

export default function Wireframe2C({ params }: PageProps) {
  // Show chosen on 2B (#/2c?venue=<id>)
  const venue = findVenue(params.get("venue"));
  const nextHref = `#/2d?venue=${encodeURIComponent(venue.id)}`;
  const member = getSession().member;

  const { pendingKey, error, run } = useBridgeAction();
  const [availability, setAvailability] = useState<EventAvailabilityResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);        // assigned seating
  const [ticketSection, setTicketSection] = useState<string | null>(null);  // GA ticket type
  const [quantity, setQuantity] = useState(GA_DEFAULT_QUANTITY);            // GA quantity

  // GET /events/:id/availability: live inventory for this show
  useEffect(() => {
    let cancelled = false;
    loadAvailability(venue.id)
      .then((a) => { if (!cancelled) setAvailability(a); })
      .catch((err) => { if (!cancelled) setLoadError(describeError(err)); });
    return () => { cancelled = true; };
  }, [venue.id]);

  // GA ticket types (null for assigned-seat events)
  const ga = useMemo(
    () => (availability && isGeneralAdmission(availability) ? gaOptions(availability) : null),
    [availability],
  );

  /* ---------- assigned seating: pick an adjacent pair ---------- */
  const options = useMemo(
    () => (availability && !ga ? buildSeatOptions(availability) : []),
    [availability, ga],
  );
  const selected = options.find((o) => o.id === selectedId) ?? options[0] ?? null;

  const lockAssigned = async () => {
    if (!selected) throw new Error("No seats are available to lock");
    try {
      await lockSeats(venue.id, selected.seatIds);
    } catch (err) {
      if (err instanceof BridgeError && err.status === 409) {
        setAvailability(await loadAvailability(venue.id));
        setSelectedId(null);
        throw new Error("Those seats were just taken — the list has been refreshed. Please pick another option.");
      }
      throw err;
    }
  };

  /* ---------- general admission: ticket type + quantity ---------- */
  // The chosen type; otherwise the night ticket, otherwise the first type that isn't sold out
  const ticket: GaOption | null = ga
    ? ga.find((o) => o.type.section === ticketSection) ??
      ga.find((o) => o.type.section === DEFAULT_TICKET_SECTION && o.available > 0) ??
      ga.find((o) => o.available > 0) ??
      ga[0] ??
      null
    : null;
  const maxQty = ticket
    ? Math.min(GA_MAX_PER_ORDER, member?.maxTicketsPerOrder ?? GA_MAX_PER_ORDER, ticket.available)
    : 0;
  const qty = Math.min(quantity, maxQty);
  const gaTotal =
    ticket?.price && qty > 0
      ? { amount: Math.round(ticket.price.amount * qty * 100) / 100, currency: ticket.price.currency }
      : null;
  // Daytime Only doesn't include the concert, so the stage diagram is grayed out
  const stageMuted = !!ticket && !ticket.type.includesConcert;

  // POST /carts/lock { eventId, section, quantity }: the bridge picks the tickets
  const lockGa = async () => {
    if (!ticket) throw new Error("No tickets are available");
    try {
      await lockTickets(venue.id, ticket.type.section, qty);
    } catch (err) {
      if (err instanceof BridgeError && err.status === 409) {
        // Fewer tickets of that type left than requested: show the live counts next to the message
        setAvailability(await loadAvailability(venue.id));
      }
      throw err;
    }
  };

  /* ---------- shared ---------- */
  const locking = pendingKey === "lock";
  const canLock = ga ? qty > 0 : !!selected;
  const description = ga
    ? `${venue.showName} at ${venue.venue}: a daytime conference and a night concert. Choose your ticket and how many you need — we'll hold them while you check out.`
    : `Live inventory for ${venue.showName} at ${venue.venue}.` +
      (availability ? " Pick an adjacent pair and we'll hold it while you check out." : "");
  const buttonLabel = ga
    ? locking
      ? "Holding tickets…"
      : ticket && qty > 0
        ? `Reserve ${qty} ${ticket.type.section} Ticket${qty === 1 ? "" : "s"}`
        : "Sold out"
    : locking
      ? "Locking seats…"
      : `Reserve & Lock Seats (${selected?.seatIds.length ?? 0})`;

  return (
    <PurchasePageLayout
      venue={venue}
      step={1}
      eyebrow="STEP 1 OF 3 · SELECT TICKETS"
      title="Get Your Tickets"
      description={description}
    >
      <div className="purchase-meta">
        <span className="pill pill-dark">
          {member ? `Verified member · @${member.membershipId}` : "Member not verified"}
        </span>
      </div>

      <div className="purchase-grid">
        <div className="map-panel">
          {!availability ? (
            <p className="status-note">{loadError ? "Seat map unavailable" : "Loading seat map…"}</p>
          ) : ga ? (
            <>
              <GaMap muted={stageMuted} />
              <p className="map-caption">
                {stageMuted && ticket
                  ? `${ticket.type.name} admits to the daytime conference only — the concert stage isn't included.`
                  : "Concert: standing room in front of the stage, no assigned spots."}
              </p>
            </>
          ) : (
            <SeatMap sections={availability.sections} selectedSection={selected?.section} />
          )}
        </div>

        <div className="purchase-copy">
          {loadError && <BridgeErrorNote message={loadError} />}
          {!availability && !loadError && <p className="status-note">Loading live inventory…</p>}

          {ga && (
            <>
              <div>
                <p className="eyebrow">Ticket type · live inventory</p>
                <h3>Choose your ticket</h3>
              </div>

              <div className="option-list" role="radiogroup" aria-label="Ticket type">
                {ga.map((o) => {
                  const active = o.type.section === ticket?.type.section;
                  const soldOut = o.available === 0;
                  return (
                    <button
                      key={o.type.section}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={soldOut}
                      className={`seat-option ticket-type${active ? " is-active" : ""}`}
                      onClick={() => setTicketSection(o.type.section)}
                    >
                      <span className="ticket-type-head">
                        <span className="ticket-type-name">{o.type.name}</span>
                        <span className="ticket-type-price">{o.price ? formatMoney(o.price) : "—"}</span>
                      </span>
                      <span className="ticket-type-meta">
                        <span>{o.type.access}</span>
                        <span>{soldOut ? "Sold out" : `${o.available} left`}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {ticket && (
                <div className="ga-ticket">
                  <div>
                    <strong className="ga-ticket-name">Quantity</strong>
                    <span className="ga-ticket-price">
                      {ticket.available > 0 && ticket.price
                        ? `${formatMoney(ticket.price)} each · max ${maxQty} per order`
                        : "Sold out"}
                    </span>
                  </div>
                  <div className="qty-stepper" role="group" aria-label="Ticket quantity">
                    <button
                      type="button"
                      aria-label="Remove one ticket"
                      disabled={qty <= 1}
                      onClick={() => setQuantity(Math.max(1, qty - 1))}
                    >
                      −
                    </button>
                    <output aria-live="polite">{qty}</output>
                    <button
                      type="button"
                      aria-label="Add one ticket"
                      disabled={qty >= maxQty}
                      onClick={() => setQuantity(Math.min(maxQty, qty + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {gaTotal && ticket && (
                <dl className="ga-total">
                  <dt>Total · {qty} × {ticket.type.section}</dt>
                  <dd>{formatMoney(gaTotal)}</dd>
                </dl>
              )}
            </>
          )}

          {availability && !ga && (
            <>
              <div>
                <p className="eyebrow">Available sections · live inventory</p>
                <h3>Choose your seats</h3>
              </div>
              {options.length === 0 && (
                <p className="status-note">No adjacent seat pairs are available for this show.</p>
              )}
              {options.length > 0 && (
                <div className="option-list" role="group" aria-label="Seat options">
                  {options.map((o) => {
                    const active = o.id === selected?.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={`seat-option${active ? " is-active" : ""}`}
                        aria-pressed={active}
                        onClick={() => setSelectedId(o.id)}
                      >
                        <span>{optionTitle(o)}</span>
                        {active && (
                          <span className="seat-option-seats">
                            {o.seatLabels.length} seats selected · {o.seatLabels.join(", ")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* POST /carts/lock, then on to 2D (checkout) */}
          <button
            type="button"
            className="button button-navy is-action"
            aria-disabled={!canLock}
            aria-busy={locking}
            onClick={() => {
              if (canLock) void run("lock", ga ? lockGa : lockAssigned, nextHref);
            }}
          >
            {buttonLabel} <span aria-hidden="true">→</span>
          </button>
          <BridgeErrorNote message={error} />
        </div>
      </div>
    </PurchasePageLayout>
  );
}