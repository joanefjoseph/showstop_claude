import type Database from 'better-sqlite3';

/**
 * Five tours share this mock database — one per frontend, all served through
 * the same bridge (:3003):
 *
 *   BTS WORLD TOUR 'ARIRANG'            → BTS/Weverse frontend (Vite :3000), ids = venue slug
 *   EPIK HIGH North America Tour '3.0'  → Epik High frontend   (Vite :4000), ids = city slug
 *   Lil Dumplings Comedy Show           → David Jin frontend   (Vite :4002), ids = venue slug
 *   Jay Park 2026 World Tour            → Jay Park frontend     (Vite :4001), ids = venue slug
 *   KOOM 2026 (Stage + Live)            → KOOM Live frontend   (Vite :4003), id  = event slug
 *
 * event_id === the id in that frontend's src/data/tourVenues.ts. Ids must be unique
 * across ALL tours: venue, price-level and seat ids are all derived from them.
 *
 * Seating: a tour (or a single stop, via `seating`) is seeded either with ASSIGNED
 * seats (sections → rows → numbered seats) or as GENERAL_ADMISSION: one or more
 * ticket types, each with its own price and number of interchangeable tickets.
 */

/** One block of reserved seats: every row has seats 1..seatsPerRow at one price. */
interface AssignedSection {
  section: string;
  /** Short key used in the price-level id (pl_<event>_<level>) */
  level: string;
  /** Price-level name shown to buyers, e.g. "Lower Bowl" */
  name: string;
  face: number;
  fees: number;
  rows: readonly string[];
  seatsPerRow: number;
}

/** One kind of general-admission ticket for an event, e.g. "Daytime Only". */
interface GaTicketType {
  /** Short key used in price-level and seat ids */
  key: string;
  /**
   * Public label, stored as the tickets' section: the bridge reports each ticket type as
   * its own section and buyers lock by { section, quantity }. Must match the KOOM
   * frontend's src/data/ticketTypes.ts.
   */
  section: string;
  /** Price-level (product) name */
  name: string;
  face: number;
  fees: number;
  /** Tickets on sale for this type */
  capacity: number;
}

type Seating =
  | { kind: 'ASSIGNED'; sections: readonly AssignedSection[] }
  | { kind: 'GENERAL_ADMISSION'; ticketTypes: readonly GaTicketType[] };

interface TourStop {
  id: string;
  city: string;
  country: string;
  venue: string;
  startsAt: string;
  /** Overrides the tour's seating for this stop only */
  seating?: Seating;
}

interface Tour {
  /** Event name prefix: `${name} — ${city}` */
  name: string;
  /** PRESALE: only membership tiers with presale access may buy. GENERAL: any member. */
  saleType: 'PRESALE' | 'GENERAL';
  /** Default seating for every stop on the tour */
  seating: Seating;
  stops: readonly TourStop[];
}

/* ------------------------------ seating layouts ------------------------------ */

/** Mirrors the sections drawn on page 2C. Floor A1 = $400 + $50 fees → 2 seats = $900 (matches 2D). */
const ARENA_SECTIONS: readonly AssignedSection[] = [
  { section: 'Floor A1', level: 'floor', name: 'Floor A1',   face: 400, fees: 50, rows: ['A', 'B'],           seatsPerRow: 20 },
  { section: '102',      level: 'lower', name: 'Lower Bowl', face: 200, fees: 20, rows: ['A', 'B', 'C', 'D'], seatsPerRow: 12 },
  { section: '204',      level: 'club',  name: 'Club',       face: 135, fees: 15, rows: ['A', 'B', 'C'],      seatsPerRow: 10 },
];
const ARENA_SEATING: Seating = { kind: 'ASSIGNED', sections: ARENA_SECTIONS };

/**
 * General admission. A GA ticket is still one row in `seats` (so holds, orders and tickets
 * work exactly like reserved seats), flagged general_admission = 1. The vendor mock exposes
 * that as `generalAdmission: true`; the bridge reports GA sections by count and locks them
 * by quantity. seat_number is the ticket number within its type.
 */
const GA_ROW = 'GA';

/**
 * KOOM 2026 at Terminal 5: KOOM Stage 2026 (daytime conference) and KOOM Live 2026
 * (night concert), sold as three GA ticket types. Prices are all-in (no separate fees).
 * Capacities are separate demo allocations per type.
 */
const KOOM_2026_SEATING: Seating = {
  kind: 'GENERAL_ADMISSION',
  ticketTypes: [
    { key: 'day',     section: 'Daytime Only', name: 'KOOM Stage 2026 - Daytime Only', face: 37, fees: 0, capacity: 300 },
    { key: 'night',   section: 'Night Only',   name: 'KOOM Live 2026 - Night Only',    face: 60, fees: 0, capacity: 300 },
    { key: 'all-day', section: 'All Day Pass', name: 'KOOM 2026 - All Day Pass',       face: 85, fees: 0, capacity: 200 },
  ],
};

/* ----------------------------------- tours ----------------------------------- */

/* Must match the BTS frontend's src/data/tourVenues.ts */
const BTS_STOPS: readonly TourStop[] = [
  { id: 'metlife-stadium',      city: 'New York',    country: 'US', venue: 'MetLife Stadium',   startsAt: '2026-10-14T23:30:00.000Z' },
  { id: 'sofi-stadium',         city: 'Los Angeles', country: 'US', venue: 'SoFi Stadium',      startsAt: '2026-10-18T02:30:00.000Z' },
  { id: 'gillette-stadium',     city: 'Boston',      country: 'US', venue: 'Gillette Stadium',  startsAt: '2026-10-21T23:30:00.000Z' },
  { id: 'soldier-field',        city: 'Chicago',     country: 'US', venue: 'Soldier Field',     startsAt: '2026-10-25T00:30:00.000Z' },
  { id: 'at-and-t-stadium',     city: 'Arlington',   country: 'US', venue: 'AT&T Stadium',      startsAt: '2026-10-28T00:30:00.000Z' },
  { id: 'rogers-stadium',       city: 'Toronto',     country: 'CA', venue: 'Rogers Stadium',    startsAt: '2026-10-31T23:30:00.000Z' },
  { id: 'm-and-t-bank-stadium', city: 'Baltimore',   country: 'US', venue: 'M&T Bank Stadium',  startsAt: '2026-11-04T00:30:00.000Z' },
  { id: 'allegiant-stadium',    city: 'Las Vegas',   country: 'US', venue: 'Allegiant Stadium', startsAt: '2026-11-08T03:30:00.000Z' },
];

/* Must match the Epik High frontend's src/data/tourVenues.ts. Start times assume
   8 PM local (daylight time — all dates are before DST ends on Nov 1, 2026), stored in UTC. */
const EPIK_HIGH_STOPS: readonly TourStop[] = [
  { id: 'new-york',       city: 'New York',    country: 'US', venue: 'Terminal 5',         startsAt: '2026-10-01T00:00:00.000Z' }, // Sept. 30
  { id: 'boston',         city: 'Boston',      country: 'US', venue: 'Big Night Live',     startsAt: '2026-10-02T00:00:00.000Z' }, // Oct. 1
  { id: 'toronto',        city: 'Toronto',     country: 'CA', venue: 'HISTORY',            startsAt: '2026-10-05T00:00:00.000Z' }, // Oct. 4
  { id: 'chicago',        city: 'Chicago',     country: 'US', venue: 'House of Blues',     startsAt: '2026-10-08T01:00:00.000Z' }, // Oct. 7
  { id: 'washington-dc',  city: 'Washington',  country: 'US', venue: 'The Howard Theatre', startsAt: '2026-10-11T00:00:00.000Z' }, // Oct. 10
  { id: 'atlanta',        city: 'Atlanta',     country: 'US', venue: 'The Eastern',        startsAt: '2026-10-12T00:00:00.000Z' }, // Oct. 11
  { id: 'dallas',         city: 'Dallas',      country: 'US', venue: 'Granada Theater',    startsAt: '2026-10-14T01:00:00.000Z' }, // Oct. 13
  { id: 'los-angeles',    city: 'Los Angeles', country: 'US', venue: 'The Novo',           startsAt: '2026-10-16T03:00:00.000Z' }, // Oct. 15
  { id: 'oakland',        city: 'Oakland',     country: 'US', venue: 'Fox Theater',        startsAt: '2026-10-19T03:00:00.000Z' }, // Oct. 18
  { id: 'vancouver',      city: 'Vancouver',   country: 'CA', venue: 'Orpheum Theater',    startsAt: '2026-10-21T03:00:00.000Z' }, // Oct. 20
  { id: 'seattle-oct-22', city: 'Seattle',     country: 'US', venue: 'Neptune Theatre',    startsAt: '2026-10-23T03:00:00.000Z' }, // Oct. 22
  { id: 'seattle-oct-25', city: 'Seattle',     country: 'US', venue: 'Neptune Theatre',    startsAt: '2026-10-26T03:00:00.000Z' }, // Oct. 25
  { id: 'las-vegas',      city: 'Las Vegas',   country: 'US', venue: 'House of Blues',     startsAt: '2026-10-28T03:00:00.000Z' }, // Oct. 27
  { id: 'san-diego',      city: 'San Diego',   country: 'US', venue: 'The Observatory',    startsAt: '2026-10-30T03:00:00.000Z' }, // Oct. 29
];

/* Must match the David Jin frontend's src/data/tourVenues.ts. 8 PM Eastern (EDT), stored in UTC. */
const DAVID_JIN_STOPS: readonly TourStop[] = [
  { id: 'broadway-comedy-club', city: 'New York', country: 'US', venue: 'Broadway Comedy Club', startsAt: '2026-10-26T00:00:00.000Z' }, // Oct 25
];

/* Must match the Jay Park frontend's src/data/tourVenues.ts. */
const JAY_PARK_STOPS: readonly TourStop[] = [
  { id: 'jaypark-sao-paulo',       city: 'São Paulo',          country: 'BR', venue: 'Vibra São Paulo',                              startsAt: '2026-09-03T23:00:00.000Z' },
  { id: 'jaypark-mexico-city-1',   city: 'Mexico City',        country: 'MX', venue: 'Auditorio BB',                                 startsAt: '2026-09-06T02:00:00.000Z' },
  { id: 'jaypark-mexico-city-2',   city: 'Mexico City',        country: 'MX', venue: 'Auditorio BB',                                 startsAt: '2026-09-07T02:00:00.000Z' },
  { id: 'jaypark-duluth',          city: 'Duluth',              country: 'US', venue: 'Gas South Arena',                              startsAt: '2026-09-09T00:00:00.000Z' },
  { id: 'jaypark-washington-dc',   city: 'Washington, DC',      country: 'US', venue: 'The Anthem',                                   startsAt: '2026-09-11T00:00:00.000Z' },
  { id: 'jaypark-new-york',        city: 'New York',            country: 'US', venue: 'Infosys Theater at Madison Square Garden',     startsAt: '2026-09-12T00:00:00.000Z' },
  { id: 'jaypark-toronto',         city: 'Toronto',             country: 'CA', venue: 'The Theatre at Great Canadian Toronto',        startsAt: '2026-09-14T00:00:00.000Z' },
  { id: 'jaypark-chicago',         city: 'Chicago',             country: 'US', venue: 'Aragon Ballroom',                              startsAt: '2026-09-16T01:00:00.000Z' },
  { id: 'jaypark-dallas',          city: 'Dallas',              country: 'US', venue: 'The Bomb Factory',                             startsAt: '2026-09-18T01:00:00.000Z' },
  { id: 'jaypark-phoenix',         city: 'Phoenix',             country: 'US', venue: 'Arizona Financial Theatre',                    startsAt: '2026-09-21T03:00:00.000Z' },
  { id: 'jaypark-san-francisco',   city: 'San Francisco',       country: 'US', venue: 'Bill Graham Civic Auditorium',                 startsAt: '2026-09-23T03:00:00.000Z' },
  { id: 'jaypark-seattle',         city: 'Seattle',              country: 'US', venue: 'WaMu Theater',                                startsAt: '2026-09-25T03:00:00.000Z' },
  { id: 'jaypark-los-angeles',     city: 'Los Angeles',         country: 'US', venue: 'Shrine Auditorium & Expo Hall',                startsAt: '2026-09-27T03:00:00.000Z' },
  { id: 'jaypark-cologne',         city: 'Cologne',             country: 'DE', venue: 'Palladium',                                    startsAt: '2026-10-04T18:00:00.000Z' },
  { id: 'jaypark-amsterdam',       city: 'Amsterdam',           country: 'NL', venue: 'AFAS Live',                                    startsAt: '2026-10-06T18:00:00.000Z' },
  { id: 'jaypark-berlin',          city: 'Berlin',              country: 'DE', venue: 'Uber Eats Music Hall',                         startsAt: '2026-10-08T18:00:00.000Z' },
  { id: 'jaypark-warsaw',          city: 'Warsaw',              country: 'PL', venue: 'COS Torwar',                                   startsAt: '2026-10-10T18:00:00.000Z' },
  { id: 'jaypark-vienna',          city: 'Vienna',              country: 'AT', venue: 'Gasometer',                                    startsAt: '2026-10-13T18:00:00.000Z' },
  { id: 'jaypark-zurich',          city: 'Zurich',              country: 'CH', venue: 'The Hall',                                     startsAt: '2026-10-15T18:00:00.000Z' },
  { id: 'jaypark-milan',           city: 'Milan',               country: 'IT', venue: 'Fabrique',                                     startsAt: '2026-10-17T18:00:00.000Z' },
  { id: 'jaypark-paris',           city: 'Paris',               country: 'FR', venue: 'Zénith',                                       startsAt: '2026-10-20T18:00:00.000Z' },
  { id: 'jaypark-esch-sur-alzette',city: 'Esch-sur-Alzette',     country: 'LU', venue: 'Rockhal',                                      startsAt: '2026-10-22T18:00:00.000Z' },
  { id: 'jaypark-london',          city: 'London',              country: 'UK', venue: 'OVO Arena Wembley',                            startsAt: '2026-10-26T20:00:00.000Z' },
  { id: 'jaypark-edinburgh',       city: 'Edinburgh',           country: 'UK', venue: 'Corn Exchange',                                startsAt: '2026-10-28T20:00:00.000Z' },
];

/* Must match the KOOM Live frontend's src/data/tourVenues.ts. Starts with the daytime
   conference: 10 AM Eastern (EDT), stored in UTC (placeholder start time). */
const KOOM_2026_STOPS: readonly TourStop[] = [
  { id: 'koom-live-terminal-5', city: 'New York', country: 'US', venue: 'Terminal 5', startsAt: '2026-10-16T14:00:00.000Z' }, // Oct 16
];

const TOURS: readonly Tour[] = [
  { name: "BTS WORLD TOUR 'ARIRANG'",           saleType: 'PRESALE', seating: ARENA_SEATING,     stops: BTS_STOPS },
  { name: "EPIK HIGH North America Tour '3.0'", saleType: 'PRESALE', seating: ARENA_SEATING,     stops: EPIK_HIGH_STOPS },
  { name: 'Lil Dumplings Comedy Show',          saleType: 'GENERAL', seating: ARENA_SEATING,     stops: DAVID_JIN_STOPS },
  { name: '2026 Jay Park World Tour [Serenades & Body Rolls] with LNGSHOT', saleType: 'PRESALE', seating: ARENA_SEATING, stops: JAY_PARK_STOPS },
  { name: 'KOOM 2026',                          saleType: 'GENERAL', seating: KOOM_2026_SEATING, stops: KOOM_2026_STOPS },
];

/* ---------------------------------- seeding ---------------------------------- */

const cents = (amount: number) => Math.round(amount * 100);

/** Fails fast with a readable message instead of a SQLite error mid-seed. */
function assertValidTours(): void {
  const seen = new Set<string>();
  for (const tour of TOURS) {
    for (const stop of tour.stops) {
      if (seen.has(stop.id)) {
        throw new Error(`tourSeed: duplicate event id '${stop.id}' (${tour.name}) — ids must be unique across all tours`);
      }
      seen.add(stop.id);

      const seating = stop.seating ?? tour.seating;
      if (seating.kind === 'ASSIGNED') {
        if (seating.sections.length === 0) throw new Error(`tourSeed: '${stop.id}' has assigned seating but no sections`);
        continue;
      }
      if (seating.ticketTypes.length === 0) throw new Error(`tourSeed: '${stop.id}' is general admission but has no ticket types`);
      const keys = new Set<string>();
      const sections = new Set<string>();
      for (const t of seating.ticketTypes) {
        if (!(Number.isInteger(t.capacity) && t.capacity > 0)) {
          throw new Error(`tourSeed: '${stop.id}' ticket type '${t.key}' needs a positive whole-number capacity (got ${t.capacity})`);
        }
        if (keys.has(t.key) || sections.has(t.section)) {
          throw new Error(`tourSeed: '${stop.id}' has a duplicate ticket type key or section ('${t.key}' / '${t.section}')`);
        }
        keys.add(t.key);
        sections.add(t.section);
      }
    }
  }
}

export function seedTourEvents(db: Database.Database, seededAt: string): void {
  assertValidTours();

  const insVenue = db.prepare(`INSERT INTO venues (venue_id, name, city, country) VALUES (?, ?, ?, ?)`);
  const insEvent = db.prepare(
    `INSERT INTO events (event_id, event_name, starts_at, venue_id, sale_type, currency, last_updated) VALUES (?, ?, ?, ?, ?, 'USD', ?)`,
  );
  const insLevel = db.prepare(
    `INSERT INTO price_levels (price_level_id, event_id, name, face_cents, fees_cents) VALUES (?, ?, ?, ?, ?)`,
  );
  const insSeat = db.prepare(
    `INSERT INTO seats (seat_id, event_id, section, row_label, seat_number, price_level_id, status, attributes, general_admission)
     VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)`,
  );
  const slug = (s: string) => s.replace(/\s+/g, '-');

  /** Reserved seating: one price level per section, seats numbered 1..seatsPerRow in each row. */
  const seedAssignedSeats = (eventId: string, sections: readonly AssignedSection[]): void => {
    for (const s of sections) {
      const priceLevelId = `pl_${eventId}_${s.level}`;
      insLevel.run(priceLevelId, eventId, s.name, cents(s.face), cents(s.fees));
      for (const row of s.rows) {
        for (let n = 1; n <= s.seatsPerRow; n++) {
          const attrs = n === 1 || n === s.seatsPerRow ? JSON.stringify(['AISLE']) : null;
          // seat_id is a global PK, so it must include the event id
          insSeat.run(`s_${eventId}_${slug(s.section)}_${row}_${n}`, eventId, s.section, row, String(n), priceLevelId, attrs, 0);
        }
      }
    }
  };

  /** General admission: per ticket type, one price level and `capacity` identical tickets. */
  const seedGeneralAdmission = (eventId: string, ticketTypes: readonly GaTicketType[]): void => {
    for (const t of ticketTypes) {
      const priceLevelId = `pl_${eventId}_ga_${t.key}`;
      insLevel.run(priceLevelId, eventId, t.name, cents(t.face), cents(t.fees));
      for (let n = 1; n <= t.capacity; n++) {
        insSeat.run(`s_${eventId}_GA_${t.key}_${n}`, eventId, t.section, GA_ROW, String(n), priceLevelId, null, 1);
      }
    }
  };

  for (const tour of TOURS) {
    for (const v of tour.stops) {
      const venueId = `ven_${v.id}`;
      insVenue.run(venueId, v.venue, v.city, v.country);
      insEvent.run(v.id, `${tour.name} — ${v.city}`, v.startsAt, venueId, tour.saleType, seededAt);

      const seating = v.seating ?? tour.seating;
      if (seating.kind === 'GENERAL_ADMISSION') seedGeneralAdmission(v.id, seating.ticketTypes);
      else seedAssignedSeats(v.id, seating.sections);
    }
  }
}