import type Database from 'better-sqlite3';

/**
 * Two tours share this mock database — one per frontend, both served through
 * the same bridge (:3003):
 *
 *   BTS WORLD TOUR 'ARIRANG'            → BTS/Weverse frontend (Vite :3000), ids = venue slug
 *   EPIK HIGH North America Tour '3.0'  → Epik High frontend   (Vite :4000), ids = city slug
 *
 * event_id === the id in that frontend's src/data/tourVenues.ts, so the frontend
 * can call GET /events/<id>/availability directly. Keep each list in sync with
 * its frontend. Ids must be unique across BOTH tours: venue, price-level and
 * seat ids are all derived from them.
 */
interface TourStop {
  id: string;
  city: string;
  country: string;
  venue: string;
  startsAt: string;
}

interface Tour {
  /** Event name prefix: `${name} — ${city}` */
  name: string;
  stops: readonly TourStop[];
}

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
  { id: 'new-york',       city: 'New York',    country: 'US', venue: 'Terminal 5', startsAt: '2026-10-01T00:00:00.000Z' }, // Sept. 30
  { id: 'boston',         city: 'Boston',      country: 'US', venue: 'Big Night Live', startsAt: '2026-10-02T00:00:00.000Z' }, // Oct. 1
  { id: 'toronto',        city: 'Toronto',     country: 'CA', venue: 'HISTORY', startsAt: '2026-10-05T00:00:00.000Z' }, // Oct. 4
  { id: 'chicago',        city: 'Chicago',     country: 'US', venue: 'House of Blues', startsAt: '2026-10-08T01:00:00.000Z' }, // Oct. 7
  { id: 'washington-dc',  city: 'Washington',  country: 'US', venue: 'The Howard Theatre', startsAt: '2026-10-11T00:00:00.000Z' }, // Oct. 10
  { id: 'atlanta',        city: 'Atlanta',     country: 'US', venue: 'The Eastern', startsAt: '2026-10-12T00:00:00.000Z' }, // Oct. 11
  { id: 'dallas',         city: 'Dallas',      country: 'US', venue: 'Granada Theater', startsAt: '2026-10-14T01:00:00.000Z' }, // Oct. 13
  { id: 'los-angeles',    city: 'Los Angeles', country: 'US', venue: 'The Novo', startsAt: '2026-10-16T03:00:00.000Z' }, // Oct. 15
  { id: 'oakland',        city: 'Oakland',     country: 'US', venue: 'Fox Theater', startsAt: '2026-10-19T03:00:00.000Z' }, // Oct. 18
  { id: 'vancouver',      city: 'Vancouver',   country: 'CA', venue: 'Orpheum Theater', startsAt: '2026-10-21T03:00:00.000Z' }, // Oct. 20
  { id: 'seattle-oct-22', city: 'Seattle',     country: 'US', venue: 'Neptune Theatre', startsAt: '2026-10-23T03:00:00.000Z' }, // Oct. 22
  { id: 'seattle-oct-25', city: 'Seattle',     country: 'US', venue: 'Neptune Theatre', startsAt: '2026-10-26T03:00:00.000Z' }, // Oct. 25
  { id: 'las-vegas',      city: 'Las Vegas',   country: 'US', venue: 'House of Blues', startsAt: '2026-10-28T03:00:00.000Z' }, // Oct. 27
  { id: 'san-diego',      city: 'San Diego',   country: 'US', venue: 'The Observatory', startsAt: '2026-10-30T03:00:00.000Z' }, // Oct. 29
];

const TOURS: readonly Tour[] = [
  { name: "BTS WORLD TOUR 'ARIRANG'", stops: BTS_STOPS },
  { name: "EPIK HIGH North America Tour '3.0'", stops: EPIK_HIGH_STOPS },
];

/** Mirrors the sections hard-coded on page 2C (same for both tours). Floor A1 = $400 + $50 fees → 2 seats = $900 (matches 2D). */
const TOUR_SECTIONS = [
  { section: 'Floor A1', level: 'floor', name: 'Floor A1',   face: 400, fees: 50, rows: ['A', 'B'],           seatsPerRow: 20 },
  { section: '102',      level: 'lower', name: 'Lower Bowl', face: 200, fees: 20, rows: ['A', 'B', 'C', 'D'], seatsPerRow: 12 },
  { section: '204',      level: 'club',  name: 'Club',       face: 135, fees: 15, rows: ['A', 'B', 'C'],      seatsPerRow: 10 },
] as const;

const cents = (amount: number) => Math.round(amount * 100);

/** Fails fast with a readable message instead of a SQLite PRIMARY KEY error mid-seed. */
function assertUniqueEventIds(): void {
  const seen = new Set<string>();
  for (const tour of TOURS) {
    for (const stop of tour.stops) {
      if (seen.has(stop.id)) {
        throw new Error(`tourSeed: duplicate event id '${stop.id}' (${tour.name}) — ids must be unique across all tours`);
      }
      seen.add(stop.id);
    }
  }
}

export function seedTourEvents(db: Database.Database, seededAt: string): void {
  assertUniqueEventIds();

  const insVenue = db.prepare(`INSERT INTO venues (venue_id, name, city, country) VALUES (?, ?, ?, ?)`);
  const insEvent = db.prepare(
    `INSERT INTO events (event_id, event_name, starts_at, venue_id, currency, last_updated) VALUES (?, ?, ?, ?, 'USD', ?)`,
  );
  const insLevel = db.prepare(
    `INSERT INTO price_levels (price_level_id, event_id, name, face_cents, fees_cents) VALUES (?, ?, ?, ?, ?)`,
  );
  const insSeat = db.prepare(
    `INSERT INTO seats (seat_id, event_id, section, row_label, seat_number, price_level_id, status, attributes, general_admission)
     VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, 0)`,
  );
  const slug = (s: string) => s.replace(/\s+/g, '-');

  for (const tour of TOURS) {
    for (const v of tour.stops) {
      const venueId = `ven_${v.id}`;
      insVenue.run(venueId, v.venue, v.city, v.country);
      insEvent.run(v.id, `${tour.name} — ${v.city}`, v.startsAt, venueId, seededAt);

      for (const s of TOUR_SECTIONS) {
        const priceLevelId = `pl_${v.id}_${s.level}`;
        insLevel.run(priceLevelId, v.id, s.name, cents(s.face), cents(s.fees));
        for (const row of s.rows) {
          for (let n = 1; n <= s.seatsPerRow; n++) {
            const attrs = n === 1 || n === s.seatsPerRow ? JSON.stringify(['AISLE']) : null;
            // seat_id is a global PK, so it must include the event id
            insSeat.run(`s_${v.id}_${slug(s.section)}_${row}_${n}`, v.id, s.section, row, String(n), priceLevelId, attrs);
          }
        }
      }
    }
  }
}