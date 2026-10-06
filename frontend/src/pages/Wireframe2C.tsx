import WeverseCommunityLayout from "../components/WeverseCommunityLayout";
import { findVenue } from "../data/tourVenues";
import type { PageProps } from "../routing";

/* Minimal stadium SVG placeholder */
function StadiumMap() {
  return (
    <svg
      viewBox="0 0 200 130"
      style={{ width: "100%", height: "100%", display: "block" }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="130" fill="#f8f8f5" />
      {/* outer oval */}
      <ellipse cx="100" cy="65" rx="90" ry="55" stroke="#d0d0c8" strokeWidth="1" fill="#f0f0ec" />
      {/* mid bowl */}
      <ellipse cx="100" cy="65" rx="65" ry="38" stroke="#c0c0b8" strokeWidth="1" fill="#e8e8e2" />
      {/* inner lower bowl */}
      <ellipse cx="100" cy="65" rx="45" ry="25" stroke="#b0b0a8" strokeWidth="1" fill="#dcdcd8" />
      {/* stage */}
      <rect x="78" y="55" width="44" height="20" rx="1" fill="#333" stroke="#0a0a0a" strokeWidth="0.5" />
      <text x="100" y="67" textAnchor="middle" fill="#fff" fontSize="6" fontFamily="JetBrains Mono, monospace">STAGE</text>
      {/* selected seats Floor A1 */}
      <rect x="83" y="75" width="14" height="8" rx="0.5" fill="var(--accent)" opacity="0.9" />
      <text x="90" y="81" textAnchor="middle" fill="#fff" fontSize="5" fontFamily="JetBrains Mono, monospace">FL A1</text>
      {/* other floor sections */}
      {[["FL A2", 100], ["FL A3", 117]].map(([label, x]) => (
        <g key={label as string}>
          <rect x={Number(x) - 7} y={75} width={14} height={8} rx={0.5} fill="#c8c8c0" />
          <text x={Number(x)} y={81} textAnchor="middle" fill="#555" fontSize={5} fontFamily="JetBrains Mono, monospace">
            {label as string}
          </text>
        </g>
      ))}
      {/* 100 level band label */}
      <text x="100" y="108" textAnchor="middle" fill="#999" fontSize="6" fontFamily="JetBrains Mono, monospace">100 LEVEL</text>
      {/* legend dot */}
      <rect x="10" y="10" width="8" height="8" fill="var(--accent)" rx="0.5" />
      <text x="21" y="17" fill="var(--accent)" fontSize="6" fontFamily="JetBrains Mono, monospace">Selected</text>
    </svg>
  );
}

export default function Wireframe2C({ params }: PageProps) {
  // Venue chosen on 2B — each "Presale Active →" button links to #/2c?venue=<id>
  const venue = findVenue(params.get("venue"));

  return (
    <WeverseCommunityLayout>
      <div style={{ background: "#fff" }}>
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
            <div
              className="font-mono-display"
              style={{ fontSize: 10, color: "var(--success)", marginTop: 2 }}
            >
              Presale Access: 🟢 UNLOCKED (ARMY Regular Tier)
            </div>
          </div>
          <div
            className="font-mono-display"
            style={{
              fontSize: 9,
              color: "var(--ink-muted)",
              border: "1px solid var(--border)",
              padding: "3px 8px",
            }}
          >
            GET /events/:id/availability
          </div>
        </div>

        {/* Map stacked above the inventory panel so both fit the 580px Main Content Area */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
          {/* Stadium map — full content width */}
          <div
            style={{
              borderBottom: "1px solid var(--border)",
              padding: 24,
              height: 380,
            }}
          >
            <StadiumMap />
          </div>

          {/* Inventory panel (text and spacing scaled up ~1.5x to match) */}
          <div style={{ padding: 20 }}>
            <div
              className="font-mono-display"
              style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: "var(--ink-muted)" }}
            >
              Available Sections (Live Inventory)
            </div>
            {[
              {
                label: "Section Floor A1 — $450",
                sub: "2 Seats Selected [A11, A12]",
                active: true,
              },
              { label: "Section 102 (Lower Bowl) — $220", sub: null, active: false },
              { label: "Section 204 (Club) — $150", sub: null, active: false },
            ].map((s) => (
              /* Dead link: looks clickable (pointer cursor); the click is swallowed by the layout */
              <a
                key={s.label}
                href="#"
                style={{
                  display: "block",
                  border: `1px solid ${s.active ? "var(--accent)" : "var(--border)"}`,
                  background: s.active ? "#f0f5ff" : "#fff",
                  padding: "12px 16px",
                  marginBottom: 10,
                  borderRadius: 1,
                }}
              >
                <div className="font-mono-display" style={{ fontSize: 15, fontWeight: s.active ? 600 : 400 }}>
                  {s.label}
                </div>
                {s.sub && (
                  <div
                    className="font-mono-display"
                    style={{ fontSize: 14, color: "var(--accent)", marginTop: 4 }}
                  >
                    {s.sub}
                  </div>
                )}
              </a>
            ))}

            {/* Links to 2D — checkout */}
            <a
              href={`#/2d?venue=${venue.id}`}
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
                cursor: "pointer",
              }}
            >
              🔒 Reserve &amp; Lock Seats (2)
            </a>
          </div>
        </div>
      </div>
    </WeverseCommunityLayout>
  );
}