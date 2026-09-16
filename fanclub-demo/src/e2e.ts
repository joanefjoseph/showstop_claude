import Database from 'better-sqlite3';
import { demoConfig } from './config.ts';
import {
  generateRotatingBarcode,
  type BillingResponse,
  type CommitResponse,
  type EventAvailabilityResponse,
  type MembershipVerificationResponse,
  type MobileTicketResponse,
  type SeatLockResponse,
} from './bridgeContracts.ts';
const BRIDGE = demoConfig.bridgeUrl;
let passed = 0;
let failed = 0;
class StepFailed extends Error {}
async function call<T = any>(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string> } = {}) {
  const res = await fetch(`${BRIDGE}${path}`, {
    method,
    headers: { ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: any = text;
  try { body = text ? JSON.parse(text) : undefined; } catch { /* keep raw text */ }
  return { status: res.status, body: body as T };
}
function check(label: string, ok: boolean, detail?: unknown): boolean {
  if (ok) { passed++; console.log(`  ✔ ${label}`); }
  else {
    failed++;
    console.log(`  ✘ ${label}`);
    if (detail !== undefined) console.log(JSON.stringify(detail, null, 2).replace(/^/gm, '      '));
  }
  return ok;
}
function must(label: string, ok: boolean, detail?: unknown) {
  if (!check(label, ok, detail)) throw new StepFailed(label);
}
const section = (title: string) => console.log(`\n▶ ${title}`);
const info = (msg: string) => console.log(`    ℹ ${msg}`);
function pickSeats(ev: EventAvailabilityResponse, n: number, preferred: string[] = []): string[] {
  const available = ev.sections.flatMap((s) => s.seats.map((seat) => seat.seatId));
  if (preferred.length === n && preferred.every((id) => available.includes(id))) return preferred;
  if (available.length < n) throw new StepFailed(`Only ${available.length} seats left on ${ev.eventId}; run "npm run start:fresh"`);
  return available.slice(0, n);
}
const billing = (paymentToken: string, firstName = 'Ada', lastName = 'Lovelace', email = 'fan@example.com') => ({
  customer: { firstName, lastName, email, phone: '+15125550142' },
  address: { line1: '1 Main St', city: 'Austin', region: 'TX', postalCode: '78701', country: 'US' },
  payment: { paymentToken, method: 'CARD' },
});
/* ─────────────────────────── happy path ─────────────────────────── */
async function happyPath() {
  section('0. GET /health');
  const health = await call('GET', '/health');
  must('bridge is up', health.status === 200, health.body);
  section('1. GET /events/:eventId/availability');
  const avail = await call<EventAvailabilityResponse>('GET', '/events/evt_123/availability');
  must('200 OK', avail.status === 200, avail.body);
  must('event details mapped', avail.body.eventName === 'The Midnight Echoes — World Tour' && avail.body.venue.city === 'Austin');
  must('seats grouped by section with price ranges', avail.body.sections.some((s) => s.section === '101' && s.priceRange !== null));
  must('totals include held and sold seats', avail.body.totals.held > 0 && avail.body.totals.sold > 0, avail.body.totals);
  const seats = pickSeats(avail.body, 2, ['s_101_A_7', 's_101_A_8']);
  info(`totals ${JSON.stringify(avail.body.totals)}; locking ${seats.join(', ')}`);
  section('2. POST /membership/verify');
  const verify = await call<MembershipVerificationResponse>('POST', '/membership/verify', { body: { email: 'FAN@example.com' } });
  must('200 OK', verify.status === 200, verify.body);
  must('verified and eligible to purchase', verify.body.verified && verify.body.eligibleToPurchase, verify.body);
  must('resolves mem_9f3 / Gold tier', verify.body.membershipId === 'mem_9f3' && verify.body.tier?.name === 'Gold', verify.body);
  const memberId = verify.body.membershipId!;
  section('3. POST /carts/lock');
  const lock = await call<SeatLockResponse>('POST', '/carts/lock', {
    headers: { 'X-Membership-Id': memberId },
    body: { eventId: 'evt_123', seatIds: seats },
  });
  must('201 Created', lock.status === 201, lock.body);
  must('cart OPEN with 2 seats', lock.body.status === 'OPEN' && lock.body.seats.length === 2, lock.body);
  must('hold countdown running', lock.body.holdSecondsRemaining > 0, lock.body);
  must('totals = subtotal + fees', Math.abs(lock.body.totals.subtotal.amount + lock.body.totals.fees.amount - lock.body.totals.total.amount) < 0.001, lock.body.totals);
  const { cartId } = lock.body;
  info(`cart ${cartId}, total ${lock.body.totals.total.amount} ${lock.body.totals.total.currency}, expires ${lock.body.holdExpiresAt}`);
  const afterLock = await call<EventAvailabilityResponse>('GET', '/events/evt_123/availability');
  check('locked seats no longer listed as available', !afterLock.body.sections.flatMap((s) => s.seats).some((s) => seats.includes(s.seatId)));
  section('4. PUT /carts/:cartId/billing');
  const bill = await call<BillingResponse>('PUT', `/carts/${cartId}/billing`, { body: billing('tok_visa_4242') });
  must('200 OK', bill.status === 200, bill.body);
  must('status BILLING_ATTACHED', bill.body.status === 'BILLING_ATTACHED', bill.body);
  must('total unchanged from lock', bill.body.total.amount === lock.body.totals.total.amount, bill.body);
  section('5. PUT /carts/:cartId/commit');
  const idemKey = `e2e-${cartId}`;
  const commit = await call<CommitResponse>('PUT', `/carts/${cartId}/commit`, { headers: { 'Idempotency-Key': idemKey } });
  must('200 OK', commit.status === 200, commit.body);
  must('order CONFIRMED with 2 tickets', commit.body.status === 'CONFIRMED' && commit.body.tickets.length === 2, commit.body);
  info(`order ${commit.body.orderId}, tickets ${commit.body.tickets.map((t) => t.ticketId).join(', ')}`);
  const replay = await call<CommitResponse>('PUT', `/carts/${cartId}/commit`, { headers: { 'Idempotency-Key': idemKey } });
  check('replaying the same Idempotency-Key returns the same order', replay.status === 200 && replay.body.orderId === commit.body.orderId, replay.body);
  section('6. GET /tickets/:ticketId');
  const first = commit.body.tickets[0];
  const ticket = await call<MobileTicketResponse>('GET', first.mobileTicketUrl, { headers: { 'X-Membership-Id': memberId } });
  must('200 OK', ticket.status === 200, ticket.body);
  must('holder name from billing', ticket.body.holderName === 'Ada Lovelace', ticket.body);
  must('rotating PDF417 barcode', ticket.body.barcode.rotating && ticket.body.barcode.format === 'PDF417', ticket.body.barcode);
  must('nextRotationAt in the future', new Date(ticket.body.barcode.nextRotationAt!).getTime() > Date.now(), ticket.body.barcode);
  // Scanner-side verification: recompute the barcode from the secret stored in the vendor DB.
  const db = new Database(demoConfig.dbPath, { readonly: true, fileMustExist: true });
  const row = db.prepare(`SELECT barcode_secret, rotation_interval_seconds FROM tickets WHERE ticket_id = ?`).get(first.ticketId) as
    { barcode_secret: string; rotation_interval_seconds: number };
  db.close();
  const [, counter] = ticket.body.barcode.value.split('.');
  const interval = ticket.body.barcode.rotatesEverySeconds!;
  const expected = generateRotatingBarcode(row.barcode_secret, first.ticketId, interval, Number(counter) * interval * 1000).value;
  check('barcode validates against vendor secret (scanner check)', expected === ticket.body.barcode.value, { expected, got: ticket.body.barcode.value });
  const seededStatic = await call<MobileTicketResponse>('GET', '/tickets/tkt_seed_static', { headers: { 'X-Membership-Id': memberId } });
  check('seeded STATIC ticket → rotating:false', seededStatic.status === 200 && !seededStatic.body.barcode.rotating && seededStatic.body.barcode.value === 'MIDNIGHT-ECHOES-000102', seededStatic.body);
  const seededRotating = await call<MobileTicketResponse>('GET', '/tickets/tkt_seed_rotating', { headers: { 'X-Membership-Id': memberId } });
  check('seeded ROTATING ticket without interval → bridge default applied', seededRotating.status === 200 && seededRotating.body.barcode.rotatesEverySeconds !== undefined, seededRotating.body);
}
/* ─────────────────────────── guardrails ─────────────────────────── */
async function guardrails() {
  section('Guardrails: upstream rejections surface as the bridge intends');
  const unknownEvent = await call('GET', '/events/evt_nope/availability');
  check('unknown event → 404 NOT_FOUND', unknownEvent.status === 404 && unknownEvent.body?.error?.upstream === 'ticket-vendor', unknownEvent.body);
  const unknownEmail = await call('POST', '/membership/verify', { body: { email: 'nobody@example.com' } });
  check('unknown email → 404 verified:false', unknownEmail.status === 404 && unknownEmail.body?.verified === false, unknownEmail.body);
  const expiredVerify = await call('POST', '/membership/verify', { body: { email: 'expired@example.com' } });
  check('expired member → verified but not eligible', expiredVerify.status === 200 && expiredVerify.body?.eligibleToPurchase === false, expiredVerify.body);
  const lockBody = { eventId: 'evt_123', seatIds: ['s_201_C_3'] };
  const noHeader = await call('POST', '/carts/lock', { body: lockBody });
  check('lock without X-Membership-Id → 401 MEMBERSHIP_REQUIRED', noHeader.status === 401 && noHeader.body?.error?.code === 'MEMBERSHIP_REQUIRED', noHeader.body);
  const bogus = await call('POST', '/carts/lock', { headers: { 'X-Membership-Id': 'mem_does_not_exist' }, body: lockBody });
  check('unknown membership ID → 401 MEMBERSHIP_INVALID', bogus.status === 401 && bogus.body?.error?.code === 'MEMBERSHIP_INVALID', bogus.body);
  const suspended = await call('POST', '/carts/lock', { headers: { 'X-Membership-Id': 'mem_x02' }, body: lockBody });
  check('suspended member → 403 MEMBERSHIP_INACTIVE', suspended.status === 403 && suspended.body?.error?.code === 'MEMBERSHIP_INACTIVE', suspended.body);
  const silver = await call('POST', '/carts/lock', {
    headers: { 'X-Membership-Id': 'mem_s22' },
    body: { eventId: 'evt_123', seatIds: ['s_201_D_1', 's_201_D_2', 's_201_D_3', 's_201_D_4', 's_201_D_5'] },
  });
  check('Silver tier (max 4) locking 5 seats → 422 SEAT_LIMIT_EXCEEDED', silver.status === 422 && silver.body?.error?.code === 'SEAT_LIMIT_EXCEEDED', silver.body);
  const sold = await call('POST', '/carts/lock', { headers: { 'X-Membership-Id': 'mem_9f3' }, body: { eventId: 'evt_123', seatIds: ['s_101_A_1'] } });
  check('locking a SOLD seat → 409 CONFLICT', sold.status === 409 && sold.body?.error?.code === 'CONFLICT', sold.body);
  const othersTicket = await call('GET', '/tickets/tkt_seed_platinum', { headers: { 'X-Membership-Id': 'mem_9f3' } });
  check("fetching another member's ticket → 404", othersTicket.status === 404, othersTicket.body);
  section('Declined payment, then retry with a new token');
  const ga = await call<EventAvailabilityResponse>('GET', '/events/evt_456/availability');
  if (!check('festival availability', ga.status === 200, ga.body)) return;
  const [gaSeat] = pickSeats(ga.body, 1);
  const lock = await call<SeatLockResponse>('POST', '/carts/lock', { headers: { 'X-Membership-Id': 'mem_p01' }, body: { eventId: 'evt_456', seatIds: [gaSeat] } });
  if (!check(`Platinum member locks GA seat ${gaSeat}`, lock.status === 201, lock.body)) return;
  const id = lock.body.cartId;
  await call('PUT', `/carts/${id}/billing`, { body: billing('tok_decline_insufficient_funds', 'Grace', 'Hopper', 'platinum@example.com') });
  const declined = await call('PUT', `/carts/${id}/commit`, { headers: { 'Idempotency-Key': `${id}-attempt-1` } });
  check('commit with declining token → 402 PAYMENT_FAILED', declined.status === 402 && declined.body?.error?.code === 'PAYMENT_FAILED', declined.body);
  const rebill = await call('PUT', `/carts/${id}/billing`, { body: billing('tok_mastercard_5454', 'Grace', 'Hopper', 'platinum@example.com') });
  check('re-attach billing on the same cart → 200', rebill.status === 200, rebill.body);
  const retry = await call<CommitResponse>('PUT', `/carts/${id}/commit`, { headers: { 'Idempotency-Key': `${id}-attempt-2` } });
  check('retry commit → 200 CONFIRMED', retry.status === 200 && retry.body.status === 'CONFIRMED', retry.body);
}
async function main() {
  console.log(`Fanclub Ticketing Bridge end-to-end demo → ${BRIDGE}`);
  try {
    await happyPath();
    await guardrails();
  } catch (err) {
    failed = Math.max(failed, 1);
    if (err instanceof StepFailed) console.log(`\nAborted: ${err.message}`);
    else if ((err as { cause?: { code?: string } })?.cause?.code === 'ECONNREFUSED') console.log(`\nCould not reach the bridge at ${BRIDGE}. Is it running?`);
    else console.error(err);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
await main();
