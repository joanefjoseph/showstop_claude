import { pathToFileURL } from 'node:url';
import type Database from 'better-sqlite3';
import { demoConfig } from '../config.ts';
import type { SeatStatus } from '../bridgeContracts.ts';
import { applySchema, openDb } from './connection.ts';
/* ... unchanged seed data and seeders ... */
// ESM replacement for `require.main === module`
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const db = openDb();
  const counts = seedDatabase(db);
  console.log(`Seeded ${demoConfig.dbPath}`);
  console.table(counts);
  db.close();
}

const cents = (amount: number) => Math.round(amount * 100);
const SEEDED_AT = '2026-09-01T12:00:00.000Z';
/* ─────────────────────────── Membership data ─────────────────────────── */
const TIERS = [
  { tier_id: 'tier_platinum', name: 'Platinum', level: 4, max: 10, presale: 1 },
  { tier_id: 'tier_gold', name: 'Gold', level: 3, max: 8, presale: 1 },
  { tier_id: 'tier_silver', name: 'Silver', level: 2, max: 4, presale: 0 },
  { tier_id: 'tier_basic', name: 'Basic', level: 1, max: null, presale: null }, // exercises bridge default
];
const MEMBERS = [
  { id: 'mem_9f3', email: 'fan@example.com', status: 'ACTIVE', tier: 'tier_gold', since: '2021-03-14T00:00:00.000Z', renews: '2027-03-14T00:00:00.000Z', name: 'Ada Lovelace' },
  { id: 'mem_p01', email: 'platinum@example.com', status: 'ACTIVE', tier: 'tier_platinum', since: '2018-06-01T00:00:00.000Z', renews: '2027-06-01T00:00:00.000Z', name: 'Grace Hopper' },
  { id: 'mem_s22', email: 'silver@example.com', status: 'ACTIVE', tier: 'tier_silver', since: '2024-01-20T00:00:00.000Z', renews: '2026-12-20T00:00:00.000Z', name: 'Alan Turing' },
  { id: 'mem_b07', email: 'basic@example.com', status: 'ACTIVE', tier: 'tier_basic', since: '2025-08-02T00:00:00.000Z', renews: null, name: 'Katherine Johnson' },
  { id: 'mem_x01', email: 'expired@example.com', status: 'EXPIRED', tier: 'tier_gold', since: '2019-02-11T00:00:00.000Z', renews: '2026-02-11T00:00:00.000Z', name: 'Charles Babbage' },
  { id: 'mem_x02', email: 'suspended@example.com', status: 'SUSPENDED', tier: 'tier_silver', since: '2022-05-05T00:00:00.000Z', renews: '2026-11-05T00:00:00.000Z', name: 'Mallory Mischief' },
  { id: 'mem_x03', email: 'pending@example.com', status: 'PENDING', tier: 'tier_basic', since: '2026-09-10T00:00:00.000Z', renews: null, name: null },
];
/* ─────────────────────────── Vendor data ─────────────────────────── */
const VENUES = [
  ['ven_rvs', 'Riverside Amphitheater', 'Austin', 'US'],
  ['ven_hbr', 'Harbor Arena', 'Seattle', 'US'],
  ['ven_blu', 'The Blue Room', 'Nashville', 'US'],
];
const EVENTS = [
  ['evt_123', 'The Midnight Echoes — World Tour', '2026-10-18T01:00:00.000Z', 'ven_rvs'],
  ['evt_456', 'Neon Harbor Festival 2026', '2026-11-07T23:30:00.000Z', 'ven_hbr'],
  ['evt_999', 'Acoustic Sessions: Unplugged (Sold Out)', '2026-09-26T00:00:00.000Z', 'ven_blu'],
];
const PRICE_LEVELS = [
  ['pl_123_floor', 'evt_123', 'Floor Front', 189.5, 24.75],
  ['pl_123_lower', 'evt_123', 'Lower Bowl', 129.0, 18.25],
  ['pl_123_upper', 'evt_123', 'Upper Deck', 79.5, 12.4],
  ['pl_456_vip', 'evt_456', 'VIP Deck', 210.0, 29.5],
  ['pl_456_ga', 'evt_456', 'General Admission', 65.0, 9.85],
  ['pl_999_std', 'evt_999', 'Standard', 55.0, 8.2],
] as const;
interface SectionSpec {
  eventId: string;
  section: string;
  priceLevelId: string;
  rows: string[];
  seatsPerRow: number;
  generalAdmission?: boolean;
  status?: (row: string, n: number) => SeatStatus;
}
const SECTIONS: SectionSpec[] = [
  { eventId: 'evt_123', section: '101', priceLevelId: 'pl_123_floor', rows: ['A', 'B', 'C'], seatsPerRow: 10 },
  {
    eventId: 'evt_123', section: '102', priceLevelId: 'pl_123_lower', rows: ['A', 'B', 'C', 'D'], seatsPerRow: 12,
    status: (row, n) => (['C', 'D'].includes(row) && n >= 8 ? 'SOLD' : 'AVAILABLE'),
  },
  {
    eventId: 'evt_123', section: '201', priceLevelId: 'pl_123_upper', rows: ['A', 'B', 'C', 'D', 'E'], seatsPerRow: 14,
    status: (row, n) => (row === 'B' && n % 3 === 0 ? 'SOLD' : 'AVAILABLE'),
  },
  {
    eventId: 'evt_456', section: 'VIP', priceLevelId: 'pl_456_vip', rows: ['1', '2'], seatsPerRow: 12,
    status: (row, n) => (row === '1' && n <= 4 ? 'SOLD' : 'AVAILABLE'),
  },
  {
    eventId: 'evt_456', section: 'GA', priceLevelId: 'pl_456_ga', rows: ['FLOOR'], seatsPerRow: 60, generalAdmission: true,
    status: (_row, n) => (n <= 25 ? 'SOLD' : 'AVAILABLE'),
  },
  { eventId: 'evt_999', section: 'MAIN', priceLevelId: 'pl_999_std', rows: ['A', 'B'], seatsPerRow: 10, status: () => 'SOLD' },
];
/** Explicit seat states that override the section rules above. */
const SEAT_OVERRIDES: Record<string, SeatStatus> = {
  s_101_A_1: 'SOLD', // seeded order ord_seed_001 (mem_9f3)
  s_101_A_2: 'SOLD', // seeded order ord_seed_001 (mem_9f3)
  s_101_B_3: 'SOLD', // seeded order ord_seed_002 (mem_p01)
  s_101_B_4: 'SOLD',
  s_101_B_5: 'SOLD',
  s_101_B_6: 'SOLD',
  s_102_A_5: 'HELD', // held by another sales channel (box office)
  s_102_A_6: 'HELD',
  s_201_E_7: 'UNAVAILABLE', // camera platform
};
function seatAttributes(spec: SectionSpec, row: string, n: number): string[] {
  const attrs: string[] = [];
  if (!spec.generalAdmission && (n === 1 || n === spec.seatsPerRow)) attrs.push('AISLE');
  if (spec.section === '102' && row === 'D' && n <= 2) attrs.push('ADA');
  if (spec.section === '201' && row === 'A' && n >= spec.seatsPerRow - 1) attrs.push('OBSTRUCTED_VIEW');
  return attrs;
}
/* ─────────────────────────── Seeders ─────────────────────────── */
function seedMembership(db: Database.Database) {
  const insTier = db.prepare(
    `INSERT INTO membership_tiers (tier_id, name, level, max_tickets_per_order, presale_access)
     VALUES (@tier_id, @name, @level, @max, @presale)`,
  );
  TIERS.forEach((t) => insTier.run(t));
  const insMember = db.prepare(
    `INSERT INTO members (membership_id, email, status, tier_id, member_since, renews_at, display_name)
     VALUES (@id, @email, @status, @tier, @since, @renews, @name)`,
  );
  MEMBERS.forEach((m) => insMember.run(m));
}
function seedVendor(db: Database.Database) {
  const insVenue = db.prepare(`INSERT INTO venues (venue_id, name, city, country) VALUES (?, ?, ?, ?)`);
  VENUES.forEach((v) => insVenue.run(...v));
  const insEvent = db.prepare(
    `INSERT INTO events (event_id, event_name, starts_at, venue_id, currency, last_updated) VALUES (?, ?, ?, ?, 'USD', ?)`,
  );
  EVENTS.forEach((e) => insEvent.run(...e, SEEDED_AT));
  const insLevel = db.prepare(
    `INSERT INTO price_levels (price_level_id, event_id, name, face_cents, fees_cents) VALUES (?, ?, ?, ?, ?)`,
  );
  PRICE_LEVELS.forEach(([id, evt, name, face, fees]) => insLevel.run(id, evt, name, cents(face), cents(fees)));
  const insSeat = db.prepare(
    `INSERT INTO seats (seat_id, event_id, section, row_label, seat_number, price_level_id, status, attributes, general_admission)
     VALUES (@seat_id, @event_id, @section, @row_label, @seat_number, @price_level_id, @status, @attributes, @ga)`,
  );
  for (const spec of SECTIONS) {
    for (const row of spec.rows) {
      for (let n = 1; n <= spec.seatsPerRow; n++) {
        const seatId = `s_${spec.section}_${row}_${n}`;
        const attrs = seatAttributes(spec, row, n);
        insSeat.run({
          seat_id: seatId,
          event_id: spec.eventId,
          section: spec.section,
          row_label: row,
          seat_number: String(n),
          price_level_id: spec.priceLevelId,
          status: SEAT_OVERRIDES[seatId] ?? spec.status?.(row, n) ?? 'AVAILABLE',
          attributes: attrs.length ? JSON.stringify(attrs) : null,
          ga: spec.generalAdmission ? 1 : 0,
        });
      }
    }
  }
  // Pre-existing purchases so GET /tickets/:ticketId can be tested without buying first.
  seedOrder(db, {
    cartId: 'cart_seed_001', orderId: 'ord_seed_001', eventId: 'evt_123', membershipId: 'mem_9f3',
    holderName: 'Ada Lovelace', entryGate: 'Gate A',
    tickets: [
      // interval NULL -> bridge applies BARCODE_ROTATION_SECONDS
      { ticketId: 'tkt_seed_rotating', seatId: 's_101_A_1', type: 'ROTATING', format: 'PDF417', secret: 'seed-secret-rotating-0001', intervalSeconds: null },
      { ticketId: 'tkt_seed_static', seatId: 's_101_A_2', type: 'STATIC', format: 'QR', value: 'MIDNIGHT-ECHOES-000102' },
    ],
  });
  seedOrder(db, {
    cartId: 'cart_seed_002', orderId: 'ord_seed_002', eventId: 'evt_123', membershipId: 'mem_p01',
    holderName: 'Grace Hopper', entryGate: 'Gate A',
    tickets: [
      { ticketId: 'tkt_seed_platinum', seatId: 's_101_B_3', type: 'ROTATING', format: 'QR', secret: 'seed-secret-platinum-0002', intervalSeconds: 15 },
    ],
  });
}
interface SeedTicket {
  ticketId: string;
  seatId: string;
  type: 'ROTATING' | 'STATIC';
  format: 'QR' | 'PDF417';
  secret?: string;
  value?: string;
  intervalSeconds?: number | null;
}
function seedOrder(
  db: Database.Database,
  o: { cartId: string; orderId: string; eventId: string; membershipId: string; holderName: string; entryGate: string; tickets: SeedTicket[] },
) {
  const priced = db.prepare(
    `SELECT p.face_cents, p.fees_cents FROM seats s JOIN price_levels p ON p.price_level_id = s.price_level_id WHERE s.seat_id = ?`,
  );
  db.prepare(
    `INSERT INTO carts (cart_id, event_id, membership_id, partner_id, partner_reference, status, hold_expires_at, idempotency_key, created_at)
     VALUES (?, ?, ?, ?, ?, 'COMMITTED', ?, ?, ?)`,
  ).run(o.cartId, o.eventId, o.membershipId, demoConfig.vendorPartnerId, `seed:${o.cartId}`, '2026-09-01T12:05:00.000Z', `seed:${o.cartId}`, SEEDED_AT);
  const insItem = db.prepare(`INSERT INTO cart_items (cart_id, seat_id, price_cents, fees_cents) VALUES (?, ?, ?, ?)`);
  let total = 0;
  for (const t of o.tickets) {
    const { face_cents, fees_cents } = priced.get(t.seatId) as { face_cents: number; fees_cents: number };
    insItem.run(o.cartId, t.seatId, face_cents, fees_cents);
    total += face_cents + fees_cents;
  }
  db.prepare(
    `INSERT INTO orders (order_id, cart_id, event_id, membership_id, status, total_cents, idempotency_key, purchased_at)
     VALUES (?, ?, ?, ?, 'CONFIRMED', ?, ?, ?)`,
  ).run(o.orderId, o.cartId, o.eventId, o.membershipId, total, `seed:${o.orderId}`, SEEDED_AT);
  const insTicket = db.prepare(
    `INSERT INTO tickets (ticket_id, order_id, event_id, seat_id, membership_id, holder_name, entry_gate,
                          barcode_type, barcode_format, barcode_secret, barcode_value, rotation_interval_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const t of o.tickets) {
    insTicket.run(
      t.ticketId, o.orderId, o.eventId, t.seatId, o.membershipId, o.holderName, o.entryGate,
      t.type, t.format, t.secret ?? null, t.value ?? null, t.intervalSeconds ?? null,
    );
  }
}
export function seedDatabase(db: Database.Database): Record<string, number> {
  applySchema(db);
  db.transaction(() => {
    seedMembership(db);
    seedVendor(db);
  })();
  const tables = ['membership_tiers', 'members', 'venues', 'events', 'price_levels', 'seats', 'carts', 'orders', 'tickets'];
  return Object.fromEntries(
    tables.map((t) => [t, (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n]),
  );
}