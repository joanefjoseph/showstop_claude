import { useEffect, useMemo, useState } from "react";
import PurchasePageLayout from "../components/PurchasePageLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";
import { loadAvailability, lockSeats } from "../api/purchaseFlow";
import { BridgeError, describeError } from "../api/bridgeClient";
import { buildSeatOptions, optionTitle } from "../api/seatOptions";
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

/* Geometry (viewBox units). Stage at the top, everything centred on x = 150. */
const STAGE = { x: 110, y: 8, w: 80, h: 18 };
const FLOOR = { x: 110, y: 34, w: 80, h: 60 };
// Centre lines of the two U's: down the left side, across the front, up the right side
const INNER_U: Pt[] = [[92, 8], [92, 112], [208, 112], [208, 8]];
const OUTER_U: Pt[] = [[62, 8], [62, 142], [238, 142], [238, 8]];

/** The bridge sends each seat's price-level name as price.level ("Floor", "Lower …", …). */
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

/** Seat map drawn from the event's live inventory; the selected option's section is highlighted in pink. */
function SeatMap({ sections, selectedSection }: { sections: SectionAvailability[]; selectedSection?: string }) {
  const tiers = groupByTier(sections);
  const label = (s: SectionAvailability) => `${s.section} · ${s.availableCount} left`;
  const textProps = {
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontSize: 6,
    fontFamily: "'DM Mono', monospace",
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

export default function Wireframe2C({ params }: PageProps) {
  // Show chosen on 2B (#/2c?venue=<id>)
  const venue = findVenue(params.get("venue"));
  const nextHref = `#/2d?venue=${encodeURIComponent(venue.id)}`;
  const member = getSession().member;

  const { pendingKey, error, run } = useBridgeAction();
  const [availability, setAvailability] = useState<EventAvailabilityResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // GET /events/:id/availability: live inventory for this show
  useEffect(() => {
    let cancelled = false;
    loadAvailability(venue.id)
      .then((a) => { if (!cancelled) setAvailability(a); })
      .catch((err) => { if (!cancelled) setLoadError(describeError(err)); });
    return () => { cancelled = true; };
  }, [venue.id]);

  const options = useMemo(() => (availability ? buildSeatOptions(availability) : []), [availability]);

  // Default to the first option; fall back to it if the selected one disappears after a refresh
  const selected = options.find((o) => o.id === selectedId) ?? options[0] ?? null;
  const locking = pendingKey === "lock";

  const lockAction = async () => {
    if (!selected) throw new Error("No seats are available to lock");
    try {
      await lockSeats(venue.id, selected.seatIds);
    } catch (err) {
      if (err instanceof BridgeError && err.status === 409) {
        // Someone else took these seats: refresh the list so the user can pick again
        setAvailability(await loadAvailability(venue.id));
        setSelectedId(null);
        throw new Error("Those seats were just taken — the list has been refreshed. Please pick another option.");
      }
      throw err;
    }
  };

  return (
    <PurchasePageLayout
      venue={venue}
      step={1}
      eyebrow="STEP 1 OF 3 · SELECT SEATS"
      title="Pick Your Spot"
      description={`Live inventory for ${venue.showName} at ${venue.venue}. Pick an adjacent pair and we'll hold it while you check out.`}
    >
      <div className="purchase-meta">
        <span className="pill pill-dark">
          {member ? `Verified member · @${member.membershipId}` : "Member not verified"}
        </span>
        <span className="api-tag">GET /events/:id/availability</span>
      </div>

      <div className="purchase-grid">
        <div className="map-panel">
          {availability ? (
            <SeatMap sections={availability.sections} selectedSection={selected?.section} />
          ) : (
            <p className="status-note">{loadError ? "Seat map unavailable" : "Loading seat map…"}</p>
          )}
        </div>

        <div className="purchase-copy">
          <div>
            <p className="eyebrow">Available sections · live inventory</p>
            <h3>Choose your seats</h3>
          </div>

          {loadError && <BridgeErrorNote message={loadError} />}
          {!availability && !loadError && <p className="status-note">Loading live inventory…</p>}
          {availability && options.length === 0 && (
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

          {/* POST /carts/lock for the selected pair, then on to 2D (checkout) */}
          <button
            type="button"
            className="button button-navy is-action"
            aria-disabled={!selected}
            aria-busy={locking}
            onClick={() => {
              if (selected) void run("lock", lockAction, nextHref);
            }}
          >
            {locking ? "Locking seats…" : `Reserve & Lock Seats (${selected?.seatIds.length ?? 0})`}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <BridgeErrorNote message={error} />
        </div>
      </div>
    </PurchasePageLayout>
  );
}