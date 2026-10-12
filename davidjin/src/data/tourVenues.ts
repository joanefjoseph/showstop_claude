export interface TourVenue {
  /** URL-safe id passed from 2B to 2C as ?venue=<id>. Must equal the vendor event_id
   *  seeded by fanclub-demo/src/db/tourSeed.ts (JOHN_SMITH_STOPS). */
  id: string;
  /** Show name as printed on the 2B list and the 2C–2E headings */
  showName: string;
  /** Show date as printed on the 2B list, e.g. "Oct 25, 2026" */
  dateLabel: string;
  city: string;
  /** State / province abbreviation */
  region: string;
  /** Venue name, shown on 2B–2E */
  venue: string;
}

/** Shows that are on sale. "Coming Soon" rows on 2B have no vendor event and are not listed here. */
export const TOUR_VENUES: TourVenue[] = [
  { id: "broadway-comedy-club", showName: "Lil Dumplings Comedy Show", dateLabel: "Oct 25, 2026", city: "New York", region: "NY", venue: "Broadway Comedy Club" },
];

/** Looks up a venue by id; falls back to the first show if missing or unknown. */
export function findVenue(id: string | null): TourVenue {
  return TOUR_VENUES.find((v) => v.id === id) ?? TOUR_VENUES[0];
}