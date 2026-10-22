export type TourRegion = "latam" | "na" | "eu";

export interface TourVenue {
  /** URL-safe id passed from 2B to 2C as ?venue=<id>. Must equal a vendor event_id
   *  seeded in fanclub-demo (src/db/tourSeed.ts) — the bridge looks the event up by it. */
  id: string;
  /** Region tab the stop is listed under on 2B */
  region: TourRegion;
  /** Date as printed on the 2B list, e.g. "Sep 3" */
  date: string;
  /** City as printed on the 2B list, e.g. "São Paulo, BR" */
  city: string;
  /** Venue name, shown on 2B–2E */
  venue: string;
}

export const TOUR_NAME = "2026 Jay Park World Tour [Serenades & Body Rolls] with LNGSHOT";
export const TOUR_YEAR = 2026;

/** "Sep 3, 2026" */
export function dateLabel(v: TourVenue): string {
  return `${v.date}, ${TOUR_YEAR}`;
}

export const TOUR_VENUES: TourVenue[] = [
  { id: "jaypark-sao-paulo", region: "latam", date: "Sep 3", city: "São Paulo, BR", venue: "Vibra São Paulo" },
  { id: "jaypark-mexico-city-1", region: "latam", date: "Sep 5", city: "Mexico City, MX", venue: "Auditorio BB" },
  { id: "jaypark-mexico-city-2", region: "latam", date: "Sep 6", city: "Mexico City, MX", venue: "Auditorio BB" },
  { id: "jaypark-duluth", region: "na", date: "Sep 8", city: "Duluth, GA", venue: "Gas South Arena" },
  { id: "jaypark-washington-dc", region: "na", date: "Sep 10", city: "Washington, DC", venue: "The Anthem" },
  { id: "jaypark-new-york", region: "na", date: "Sep 11", city: "New York, NY", venue: "Infosys Theater at Madison Square Garden" },
  { id: "jaypark-toronto", region: "na", date: "Sep 13", city: "Toronto, ON", venue: "The Theatre at Great Canadian Toronto" },
  { id: "jaypark-chicago", region: "na", date: "Sep 15", city: "Chicago, IL", venue: "Aragon Ballroom" },
  { id: "jaypark-dallas", region: "na", date: "Sep 17", city: "Dallas, TX", venue: "The Bomb Factory" },
  { id: "jaypark-phoenix", region: "na", date: "Sep 20", city: "Phoenix, AZ", venue: "Arizona Financial Theatre" },
  { id: "jaypark-san-francisco", region: "na", date: "Sep 22", city: "San Francisco, CA", venue: "Bill Graham Civic Auditorium" },
  { id: "jaypark-seattle", region: "na", date: "Sep 24", city: "Seattle, WA", venue: "WaMu Theater" },
  { id: "jaypark-los-angeles", region: "na", date: "Sep 26", city: "Los Angeles, CA", venue: "Shrine Auditorium & Expo Hall" },
  { id: "jaypark-cologne", region: "eu", date: "Oct 4", city: "Cologne, DE", venue: "Palladium" },
  { id: "jaypark-amsterdam", region: "eu", date: "Oct 6", city: "Amsterdam, NL", venue: "AFAS Live" },
  { id: "jaypark-berlin", region: "eu", date: "Oct 8", city: "Berlin, DE", venue: "Uber Eats Music Hall" },
  { id: "jaypark-warsaw", region: "eu", date: "Oct 10", city: "Warsaw, PL", venue: "COS Torwar" },
  { id: "jaypark-vienna", region: "eu", date: "Oct 13", city: "Vienna, AT", venue: "Gasometer" },
  { id: "jaypark-zurich", region: "eu", date: "Oct 15", city: "Zurich, CH", venue: "The Hall" },
  { id: "jaypark-milan", region: "eu", date: "Oct 17", city: "Milan, IT", venue: "Fabrique" },
  { id: "jaypark-paris", region: "eu", date: "Oct 20", city: "Paris, FR", venue: "Zénith" },
  { id: "jaypark-esch-sur-alzette", region: "eu", date: "Oct 22", city: "Esch-sur-Alzette, LU", venue: "Rockhal" },
  { id: "jaypark-london", region: "eu", date: "Oct 26", city: "London, UK", venue: "OVO Arena Wembley" },
  { id: "jaypark-edinburgh", region: "eu", date: "Oct 28", city: "Edinburgh, UK", venue: "Corn Exchange" },
];

/** Looks up a stop by id; falls back to the first stop if missing or unknown. */
export function findVenue(id: string | null): TourVenue {
  return TOUR_VENUES.find((v) => v.id === id) ?? TOUR_VENUES[0];
}