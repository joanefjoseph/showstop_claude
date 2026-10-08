export interface TourVenue {
  /** URL-safe id passed from 2B to 2C as ?venue=<id> */
  id: string;
  city: string;
  /** State / province abbreviation shown on the tour dates list */
  region: string;
  venue: string;
}

export const TOUR_VENUES: TourVenue[] = [
  { id: "metlife-stadium", city: "New York", region: "NY", venue: "MetLife Stadium" },
  { id: "sofi-stadium", city: "Los Angeles", region: "CA", venue: "SoFi Stadium" },
  { id: "gillette-stadium", city: "Boston", region: "MA", venue: "Gillette Stadium" },
  { id: "soldier-field", city: "Chicago", region: "IL", venue: "Soldier Field" },
  { id: "at-and-t-stadium", city: "Arlington", region: "TX", venue: "AT&T Stadium" },
  { id: "rogers-stadium", city: "Toronto", region: "ON", venue: "Rogers Stadium" },
  { id: "m-and-t-bank-stadium", city: "Baltimore", region: "MD", venue: "M&T Bank Stadium" },
  { id: "allegiant-stadium", city: "Las Vegas", region: "NV", venue: "Allegiant Stadium" },
];

/** Looks up a venue by id; falls back to New York (MetLife Stadium) if missing or unknown. */
export function findVenue(id: string | null): TourVenue {
  return TOUR_VENUES.find((v) => v.id === id) ?? TOUR_VENUES[0];
}