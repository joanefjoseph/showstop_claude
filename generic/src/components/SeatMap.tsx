import type { SectionAvailability } from "../api/bridgeTypes";

type Pt = [number, number];
type Tier = "floor" | "lower" | "upper";

const BAND = 24; // thickness of each U
const GAP = 6;   // space between stage, floor and the two U's
const FILL: Record<Tier, string> = { floor: "#d2d0c7", lower: "#dddbd2", upper: "#e7e5dd" };

/* Geometry (viewBox units). Stage at the top, everything centred on x = 150. */
const STAGE = { x: 110, y: 8, w: 80, h: 18 };
const FLOOR = { x: 110, y: 34, w: 80, h: 60 };
// Centre lines of the two U's: down the left side, across the front, up the right side
const INNER_U: Pt[] = [[92, 8], [92, 112], [208, 112], [208, 8]];
const OUTER_U: Pt[] = [[62, 8], [62, 142], [238, 142], [238, 8]];

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

  // Point at a distance along the line, and whether that stretch runs vertically
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
    // Corners of the U that fall inside this piece
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

/**
 * Seat map drawn from the event's live inventory. Floor sections are a block directly in
 * front of the stage; the lower level wraps the stage on three sides as a U; the remaining
 * (upper) levels form a second U around that one. The selected option's section is highlighted.
 */
export function SeatMap({ sections, selectedSection }: { sections: SectionAvailability[]; selectedSection?: string }) {
  const tiers = groupByTier(sections);
  const label = (s: SectionAvailability) => `${s.section}${s.generalAdmission ? " (GA)" : ""} · ${s.availableCount} left`;
  const textProps = {
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontSize: 6,
    fontFamily: "JetBrains Mono, monospace",
  };

  // One U per level; several sections on the same level share the U end to end
  const ring = (tier: "lower" | "upper", line: Pt[]) =>
    splitPolyline(line, tiers[tier].length).map(({ d, mid }, i) => {
      const s = tiers[tier][i];
      const active = s.section === selectedSection;
      const [x, y] = mid.pt;
      return (
        <g key={s.section}>
          <path
            d={d}
            fill="none"
            strokeWidth={BAND}
            strokeLinejoin="round"
            style={{ stroke: active ? "var(--accent)" : FILL[tier] }}
          />
          <text
            {...textProps}
            x={x}
            y={y}
            fill={active ? "#fff" : "#555"}
            transform={mid.vertical ? `rotate(-90 ${x} ${y})` : undefined}
          >
            {label(s)}
          </text>
        </g>
      );
    });

  // Floor sections sit side by side in the block in front of the stage
  const floorCount = tiers.floor.length;
  const floorW = floorCount ? (FLOOR.w - 3 * (floorCount - 1)) / floorCount : 0;

  return (
    <svg
      viewBox="44 0 212 162"
      role="img"
      aria-label="Seat map"
      style={{ width: "100%", maxWidth: 520, height: "auto", display: "block", margin: "0 auto" }}
    >
      <rect x={44} y={0} width={212} height={162} fill="#f8f8f5" />

      <rect x={STAGE.x} y={STAGE.y} width={STAGE.w} height={STAGE.h} rx={1} fill="#333" />
      <text {...textProps} x={150} y={STAGE.y + STAGE.h / 2} fill="#fff">STAGE</text>

      {tiers.floor.map((s, i) => {
        const active = s.section === selectedSection;
        const x = FLOOR.x + i * (floorW + 3);
        return (
          <g key={s.section}>
            <rect
              x={x} y={FLOOR.y} width={floorW} height={FLOOR.h} rx={2}
              style={{ fill: active ? "var(--accent)" : FILL.floor }}
            />
            <text {...textProps} x={x + floorW / 2} y={FLOOR.y + FLOOR.h / 2} fill={active ? "#fff" : "#555"}>
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

