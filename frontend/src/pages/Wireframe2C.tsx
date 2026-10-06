import { useEffect, useMemo, useState } from "react";
import WeverseCommunityLayout from "../components/WeverseCommunityLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";
import { loadAvailability, lockSeats } from "../api/purchaseFlow";
import { BridgeError, describeError } from "../api/bridgeClient";
import { buildSeatOptions, optionTitle } from "../api/seatOptions";
import { getSession } from "../api/purchaseSession";
import { useBridgeAction } from "../api/useBridgeAction";
import type { EventAvailabilityResponse } from "../api/bridgeTypes";

/* Minimal stadium SVG placeholder (decorative; unchanged) */
function StadiumMap() {
  return (
    <svg
      viewBox="0 0 200 130"
      style={{ width: "100%", height: "100%", display: "block" }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="130" fill="#f8f8f5" />
      <ellipse cx="100" cy="65" rx="90" ry="55" stroke="#d0d0c8" strokeWidth="1" fill="#f0f0ec" />
      <ellipse cx="100" cy="65" rx="65" ry="38" stroke="#c0c0b8" strokeWidth="1" fill="#e8e8e2" />
      <ellipse cx="100" cy="65" rx="45" ry="25" stroke="#b0b0a8" strokeWidth="1" fill="#dcdcd8" />
      <rect x="78" y="55" width="44" height="20" rx="1" fill="#333" stroke="#0a0a0a" strokeWidth="0.5" />
      <text x="100" y="67" textAnchor="middle" fill="#fff" fontSize="6" fontFamily="JetBrains Mono, monospace">STAGE</text>
      <rect x="83" y="75" width="14" height="8" rx="0.5" fill="var(--accent)" opacity="0.9" />
      <text x="90" y="81" textAnchor="middle" fill="#fff" fontSize="5" fontFamily="JetBrains Mono, monospace">FL A1</text>
      {[["FL A2", 100], ["FL A3", 117]].map(([label, x]) => (
        <g key={label as string}>
          <rect x={Number(x) - 7} y={75} width={14} height={8} rx={0.5} fill="#c8c8c0" />
          <text x={Number(x)} y={81} textAnchor="middle" fill="#555" fontSize={5} fontFamily="JetBrains Mono, monospace">
            {label as string}
          </text>
        </g>
      ))}
      <text x="100" y="108" textAnchor="middle" fill="#999" fontSize="6" fontFamily="JetBrains Mono, monospace">100 LEVEL</text>
      <rect x="10" y="10" width="8" height="8" fill="var(--accent)" rx="0.5" />
      <text x="21" y="17" fill="var(--accent)" fontSize="6" fontFamily="JetBrains Mono, monospace">Selected</text>
    </svg>
  );
}

export default function Wireframe2C({ params }: PageProps) {
  // Venue chosen on 2B (#/2c?venue=<id>); defaults to New York / MetLife Stadium
  const venue = findVenue(params.get("venue"));
  const nextHref = `#/2d?venue=${venue.id}`;
  const member = getSession().member;

  const { pendingKey, error, run } = useBridgeAction();
  const [availability, setAvailability] = useState<EventAvailabilityResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // GET /events/:id/availability — live inventory for this venue's event
  useEffect(() => {
    let cancelled = false;
    loadAvailability(venue.id)
      .then((a) => { if (!cancelled) setAvailability(a); })
      .catch((err) => { if (!cancelled) setLoadError(describeError(err)); });
    return () => { cancelled = true; };
  }, [venue.id]);

  const options = useMemo(
    () => (availability ? buildSeatOptions(availability) : []),
    [availability],
  );
  // Default to the first option; fall back to it if the selected one disappears after a refresh
  const selected = options.find((o) => o.id === selectedId) ?? options[0] ?? null;

  const lockAction = async () => {
    if (!selected) throw new Error("No seats are available to lock");
    try {
      await lockSeats(venue.id, selected.seatIds);
    } catch (err) {
      if (err instanceof BridgeError && err.status === 409) {
        // Someone else took these seats — refresh the list so the user can pick again
        setAvailability(await loadAvailability(venue.id));
        setSelectedId(null);
        throw new Error("Those seats were just taken — the list has been refreshed. Please pick another option.");
      }
      throw err;
    }
  };

  return (
    <WeverseCommunityLayout>
      <div style={{ background: "#fff" }}>
        {/* Header */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              BTS WORLD TOUR 'ARIRANG' — {venue.city} ({venue.venue})
            </div>
            <div className="font-mono-display" style={{ fontSize: 10, color: "var(--success)", marginTop: 2 }}>
              Presale Access: 🟢 UNLOCKED (ARMY {member?.tierName ?? "Regular"} Tier)
            </div>
          </div>
          <div
            className="font-mono-display"
            style={{ fontSize: 9, color: "var(--ink-muted)", border: "1px solid var(--border)", padding: "3px 8px" }}
          >
            GET /events/:id/availability
          </div>
        </div>

        {/* Map + inventory */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
          <div style={{ borderBottom: "1px solid var(--border)", padding: 24, height: 380 }}>
            <StadiumMap />
          </div>

          <div style={{ padding: 20 }}>
            <div
              className="font-mono-display"
              style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: "var(--ink-muted)" }}
            >
              Available Sections (Live Inventory)
            </div>

            {loadError && <BridgeErrorNote message={loadError} />}
            {!availability && !loadError && (
              <div className="font-mono-display" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                Loading live inventory…
              </div>
            )}
            {availability && options.length === 0 && (
              <div className="font-mono-display" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                No adjacent seat pairs are available for this event.
              </div>
            )}

            {options.map((o) => {
              const active = o.id === selected?.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(o.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "#f0f5ff" : "#fff",
                    padding: "12px 16px",
                    marginBottom: 10,
                    borderRadius: 1,
                    cursor: "pointer",
                  }}
                >
                  <div className="font-mono-display" style={{ fontSize: 15, fontWeight: active ? 600 : 400 }}>
                    {optionTitle(o)}
                  </div>
                  {active && (
                    <div
                      className="font-mono-display"
                      style={{ fontSize: 14, color: "var(--accent)", marginTop: 4 }}
                    >
                      {o.seatLabels.length} seats selected [{o.seatLabels.join(", ")}]
                    </div>
                  )}
                </button>
              );
            })}

            {/* POST /carts/lock for the selected pair, then on to 2D — checkout */}
            <a
              href={nextHref}
              aria-disabled={!selected}
              onClick={(e) => {
                e.preventDefault();
                if (selected) void run("lock", lockAction, nextHref);
              }}
              aria-busy={pendingKey === "lock"}
              style={{
                background: "var(--accent)",
                color: "#fff",
                padding: "14px 18px",
                fontSize: 16,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                borderRadius: 1,
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                cursor: selected && !pendingKey ? "pointer" : "not-allowed",
                opacity: !selected || pendingKey ? 0.6 : 1,
              }}
            >
              🔒{" "}
              {pendingKey === "lock"
                ? "Locking seats…"
                : `Reserve & Lock Seats (${selected?.seatIds.length ?? 0})`}
            </a>
            <BridgeErrorNote message={error} />
          </div>
        </div>
      </div>
    </WeverseCommunityLayout>
  );
}