export interface TourVenue {
  /** URL-safe id passed from 2B to 2C as ?venue=<id> */
  id: string;
  city: string;
  /** State / province abbreviation shown on the tour dates list */
  region: string;
  venue: string;
}

export const TOUR_VENUES: TourVenue[] = [
  { id: "new-york", city: "New York", region: "NY", venue: "MetLife Stadium" },
  { id: "los-angeles", city: "Los Angeles", region: "CA", venue: "SoFi Stadium" },
  { id: "boston", city: "Boston", region: "MA", venue: "Gillette Stadium" },
  { id: "chicago", city: "Chicago", region: "IL", venue: "Soldier Field" },
  { id: "arlington", city: "Arlington", region: "TX", venue: "AT&T Stadium" },
  { id: "toronto", city: "Toronto", region: "ON", venue: "Rogers Stadium" },
  { id: "baltimore", city: "Baltimore", region: "MD", venue: "M&T Bank Stadium" },
  { id: "las-vegas", city: "Las Vegas", region: "NV", venue: "Allegiant Stadium" },
];

/** Looks up a venue by id; falls back to New York (MetLife Stadium) if missing or unknown. */
export function findVenue(id: string | null): TourVenue {
  return TOUR_VENUES.find((v) => v.id === id) ?? TOUR_VENUES[0];
}