import type Database from 'better-sqlite3';

/**
 * One vendor event per venue in the frontend's src/data/tourVenues.ts.
 * event_id === the venue's URL-safe id, so the frontend can call
 * GET /events/<venue id>/availability directly.
 * Keep these ids in sync with tourVenues.ts.
 */
const TOUR_VENUES = [
  { id: 'new-york',    city: 'New York',    country: 'US', venue: 'MetLife Stadium',    startsAt: '2026-10-14T23:30:00.000Z' },
  { id: 'los-angeles', city: 'Los Angeles', country: 'US', venue: 'SoFi Stadium',       startsAt: '2026-10-18T02:30:00.000Z' },
  { id: 'boston',      city: 'Boston',      country: 'US', venue: 'Gillette Stadium',   startsAt: '2026-10-21T23:30:00.000Z' },
  { id: 'chicago',     city: 'Chicago',     country: 'US', venue: 'Soldier Field',      startsAt: '2026-10-25T00:30:00.000Z' },
  { id: 'arlington',   city: 'Arlington',   country: 'US', venue: 'AT&T Stadium',       startsAt: '2026-10-28T00:30:00.000Z' },
  { id: 'toronto',     city: 'Toronto',     country: 'CA', venue: 'Rogers Stadium',     startsAt: '2026-10-31T23:30:00.000Z' },
  { id: 'baltimore',   city: 'Baltimore',   country: 'US', venue: 'M&T Bank Stadium',   startsAt: '2026-11-04T00:30:00.000Z' },
  { id: 'las-vegas',   city: 'Las Vegas',   country: 'US', venue: 'Allegiant Stadium',  startsAt: '2026-11-08T03:30:00.000Z' },
] as const;

/** Mirrors the sections hard-coded on page 2C. Floor A1 = $400 + $50 fees → 2 seats = $900 (matches 2D). */
const TOUR_SECTIONS = [
  { section: 'Floor A1',   level: 'floor', name: 'Floor A1',   face: 400, fees: 50, rows: ['A', 'B'],           seatsPerRow: 20 },
  { section: '102',        level: 'lower', name: 'Lower Bowl', face: 200, fees: 20, rows: ['A', 'B', 'C', 'D'], seatsPerRow: 12 },
  { section: '204',        level: 'club',  name: 'Club',       face: 135, fees: 15, rows: ['A', 'B', 'C'],      seatsPerRow: 10 },
] as const;

const cents = (amount: number) => Math.round(amount * 100);

export function seedTourEvents(db: Database.Database, seededAt: string): void {
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

  for (const v of TOUR_VENUES) {
    const venueId = `ven_${v.id}`;
    insVenue.run(venueId, v.venue, v.city, v.country);
    insEvent.run(v.id, `BTS WORLD TOUR 'ARIRANG' — ${v.city}`, v.startsAt, venueId, seededAt);

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