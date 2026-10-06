import WeverseCommunityLayout from "../components/WeverseCommunityLayout";
import BridgeErrorNote from "../components/BridgeErrorNote";
import { TOUR_VENUES } from "../data/tourVenues";
import { loadAvailability } from "../api/purchaseFlow";
import { useBridgeAction } from "../api/useBridgeAction";

export default function Wireframe2B() {
  const { pendingKey, error, run } = useBridgeAction();

  return (
    <WeverseCommunityLayout>
      <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 2 }}>
        North American Tour Dates
      </h1>
      <div
        className="font-mono-display"
        style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 14 }}
      >
        BTS WORLD TOUR 'ARIRANG'
      </div>

      <div style={{ marginBottom: 4 }}>
        <span className="font-mono-display" style={{ fontSize: 11, fontWeight: 600 }}>
          Tour Schedule:
        </span>
      </div>
      <BridgeErrorNote message={error} />
      {TOUR_VENUES.map((v) => {
        const href = `#/2c?venue=${v.id}`;
        const isPending = pendingKey === v.id;
        return (
          <div
            key={v.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border)",
              padding: "7px 0",
            }}
          >
            <span className="font-mono-display" style={{ fontSize: 11 }}>
              • {v.city}, {v.region} — {v.venue}
            </span>
            {/* GET /events/<venue id>/availability, then on to 2C — seat selection for this venue */}
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                void run(v.id, () => loadAvailability(v.id), href);
              }}
              aria-busy={isPending}
              className="font-mono-display"
              style={{
                fontSize: 10,
                background: "#e8fff4",
                color: "var(--success)",
                border: "1px solid var(--success)",
                padding: "2px 8px",
                textDecoration: "none",
                cursor: pendingKey ? "wait" : "pointer",
                opacity: pendingKey && !isPending ? 0.5 : 1,
              }}
            >
              {isPending ? "Checking seats…" : "Presale Active →"}
            </a>
          </div>
        );
      })}
    </WeverseCommunityLayout>
  );
}