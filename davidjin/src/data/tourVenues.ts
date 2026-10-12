export interface TourVenue {
  /** URL-safe id passed from 2B to 2C as ?venue=<id>. Must equal the vendor event_id
   *  seeded by fanclub-demo/src/db/tourSeed.ts. */
  id: string;
  /** Stop name as printed on the 2B tour-dates list, e.g. "WASH. DC" */
  listName: string;
  /** Show date as printed on the 2B tour-dates list, e.g. "Sept. 30" */
  dateLabel: string;
  city: string;
  /** State / province abbreviation */
  region: string;
  /** Shown on 2C/2D. Placeholder until real venues are known. */
  venue: string;
}

export const TOUR_VENUES: TourVenue[] = [
  { id: "new-york",       listName: "NEW YORK",    dateLabel: "Sept. 30", city: "New York",    region: "NY", venue: "Terminal 5" },
  { id: "boston",         listName: "BOSTON",      dateLabel: "Oct. 1",   city: "Boston",      region: "MA", venue: "Big Night Live" },
  { id: "toronto",        listName: "TORONTO",     dateLabel: "Oct. 4",   city: "Toronto",     region: "ON", venue: "HISTORY" },
  { id: "chicago",        listName: "CHICAGO",     dateLabel: "Oct. 7",   city: "Chicago",     region: "IL", venue: "House of Blues" },
  { id: "washington-dc",  listName: "WASH. DC",    dateLabel: "Oct. 10",  city: "Washington",  region: "DC", venue: "The Howard Theatre" },
  { id: "atlanta",        listName: "ATLANTA",     dateLabel: "Oct. 11",  city: "Atlanta",     region: "GA", venue: "The Eastern" },
  { id: "dallas",         listName: "DALLAS",      dateLabel: "Oct. 13",  city: "Dallas",      region: "TX", venue: "Granada Theater" },
  { id: "los-angeles",    listName: "LOS ANGELES", dateLabel: "Oct. 15",  city: "Los Angeles", region: "CA", venue: "The Novo" },
  { id: "oakland",        listName: "OAKLAND",     dateLabel: "Oct. 18",  city: "Oakland",     region: "CA", venue: "Fox Theater" },
  { id: "vancouver",      listName: "VANCOUVER",   dateLabel: "Oct. 20",  city: "Vancouver",   region: "BC", venue: "Orpheum Theater" },
  { id: "seattle-oct-22", listName: "SEATTLE",     dateLabel: "Oct. 22",  city: "Seattle",     region: "WA", venue: "Neptune Theatre" },
  { id: "seattle-oct-25", listName: "SEATTLE",     dateLabel: "Oct. 25",  city: "Seattle",     region: "WA", venue: "Neptune Theatre" },
  { id: "las-vegas",      listName: "LAS VEGAS",   dateLabel: "Oct. 27",  city: "Las Vegas",   region: "NV", venue: "House of Blues" },
  { id: "san-diego",      listName: "SAN DIEGO",   dateLabel: "Oct. 29",  city: "San Diego",   region: "CA", venue: "The Observatory" },
];

/** Looks up a venue by id; falls back to the first stop (New York) if missing or unknown. */
export function findVenue(id: string | null): TourVenue {
  return TOUR_VENUES.find((v) => v.id === id) ?? TOUR_VENUES[0];
}