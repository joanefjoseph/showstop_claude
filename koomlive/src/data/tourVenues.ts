export interface TourVenue {
  /** URL-safe id passed from 2B to 2C as ?venue=<id>. Must equal the vendor event_id
   *  seeded by fanclub-demo/src/db/tourSeed.ts. */
  id: string;
  /** Show name as printed on the landing page and the 2C–2E headings */
  showName: string;
  /** Show date, e.g. "Oct 16, 2026" */
  dateLabel: string;
  city: string;
  /** State / province abbreviation */
  region: string;
  /** Venue name */
  venue: string;
  /** Street address shown in the Location card and on the ticket page */
  address: string;
}

const DEFAULT_EVENT_ID = "koom-live-terminal-5";

/** Shows that are on sale. */
export const TOUR_VENUES: TourVenue[] = [
  {
    id: __KOOM_EVENT_ID__.trim() || DEFAULT_EVENT_ID,
    showName: "KOOM Live",
    dateLabel: "Oct 16, 2026",
    city: "New York",
    region: "NY",
    venue: "Terminal 5",
    address: "610 W 56th Street, Hell's Kitchen, Manhattan",
  },
];

export const KOOM_LIVE = TOUR_VENUES[0];

/** Looks up a venue by id; falls back to the first show if missing or unknown. */
export function findVenue(id: string | null): TourVenue {
  return TOUR_VENUES.find((v) => v.id === id) ?? TOUR_VENUES[0];
}