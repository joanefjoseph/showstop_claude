import { randomBytes } from 'node:crypto';
import express, { type Request } from 'express';
import type Database from 'better-sqlite3';
import { demoConfig } from '../config';
import type {
  CartStatus,
  SeatStatus,
  VendorAvailabilityResponse,
  VendorBarcode,
  VendorBillingRequest,
  VendorCart,
  VendorCreateCartRequest,
  VendorOrder,
  VendorSeat,
  VendorTicket,
} from '../bridgeContracts';
import { HttpError, errorHandler, newId, notFound, requestLog, simulatedLatency, toMoney } from './common';
const MAX_HOLD_SECONDS = 1800;
const DEFAULT_ROTATION_SECONDS = 15;
interface EventRow { event_id: string; event_name: string; starts_at: string; venue_id: string; currency: string; last_updated: string; venue_name: string; city: string; country: string }
interface SeatRow { seat_id: string; event_id: string; section: string; row_label: string; seat_number: string; price_level_id: string; status: SeatStatus; attributes: string | null; general_admission: number; held_by_cart_id: string | null }
interface PricedSeatRow extends SeatRow { face_cents: number; fees_cents: number }
interface PriceLevelRow { price_level_id: string; event_id: string; name: string; face_cents: number; fees_cents: number }
interface CartRow { cart_id: string; event_id: string; membership_id: string; partner_id: string; partner_reference: string | null; status: CartStatus; hold_expires_at: string; idempotency_key: string | null; billing_json: string | null; created_at: string }
interface CartItemRow { cart_id: string; seat_id: string; price_cents: number; fees_cents: number; section: string; row_label: string; seat_number: string; price_level_id: string }
interface OrderRow { order_id: string; cart_id: string; event_id: string; membership_id: string; status: 'CONFIRMED' | 'PENDING' | 'FAILED'; total_cents: number; idempotency_key: string | null; purchased_at: string }
interface TicketRow {
  ticket_id: string; order_id: string; event_id: string; seat_id: string; membership_id: string; holder_name: string; entry_gate: string | null;
  barcode_type: 'ROTATING' | 'STATIC'; barcode_format: 'QR' | 'PDF417'; barcode_secret: string | null; barcode_value: string | null; rotation_interval_seconds: number | null;
  event_name: string; starts_at: string; venue_name: string; city: string; section: string; row_label: string; seat_number: string;
}
const SEAT_ORDER = `ORDER BY s.section, s.row_label, CAST(s.seat_number AS INTEGER)`;
/** Mock of the ticket vendor's Partner API (base path /v1). */
export function createTicketVendorApi(db: Database.Database) {
  const sql = {
    event: db.prepare(`SELECT e.*, v.name AS venue_name, v.city, v.country FROM events e JOIN venues v ON v.venue_id = e.venue_id WHERE e.event_id = ?`),
    seatsForEvent: db.prepare(`SELECT s.* FROM seats s WHERE s.event_id = ? ${SEAT_ORDER}`),
    priceLevelsForEvent: db.prepare(`SELECT * FROM price_levels WHERE event_id = ? ORDER BY face_cents DESC`),
    pricedSeat: db.prepare(`SELECT s.*, p.face_cents, p.fees_cents FROM seats s JOIN price_levels p ON p.price_level_id = s.price_level_id WHERE s.seat_id = ? AND s.event_id = ?`),
    holdSeat: db.prepare(`UPDATE seats SET status = 'HELD', held_by_cart_id = ? WHERE seat_id = ? AND status = 'AVAILABLE'`),
    insertCart: db.prepare(
      `INSERT INTO carts (cart_id, event_id, membership_id, partner_id, partner_reference, status, hold_expires_at, idempotency_key, created_at)
       VALUES (@cart_id, @event_id, @membership_id, @partner_id, @partner_reference, 'OPEN', @hold_expires_at, @idempotency_key, @created_at)`,
    ),
    insertCartItem: db.prepare(`INSERT INTO cart_items (cart_id, seat_id, price_cents, fees_cents) VALUES (?, ?, ?, ?)`),
    cartById: db.prepare(`SELECT * FROM carts WHERE cart_id = ?`),
    cartByIdempotencyKey: db.prepare(`SELECT * FROM carts WHERE idempotency_key = ?`),
    cartItems: db.prepare(
      `SELECT ci.*, s.section, s.row_label, s.seat_number, s.price_level_id
       FROM cart_items ci JOIN seats s ON s.seat_id = ci.seat_id WHERE ci.cart_id = ? ${SEAT_ORDER}`,
    ),
    attachBilling: db.prepare(`UPDATE carts SET billing_json = ?, status = 'BILLING_ATTACHED' WHERE cart_id = ?`),
    orderById: db.prepare(`SELECT * FROM orders WHERE order_id = ?`),
    orderByIdempotencyKey: db.prepare(`SELECT * FROM orders WHERE idempotency_key = ?`),
    insertOrder: db.prepare(
      `INSERT INTO orders (order_id, cart_id, event_id, membership_id, status, total_cents, idempotency_key, purchased_at)
       VALUES (?, ?, ?, ?, 'CONFIRMED', ?, ?, ?)`,
    ),
    sellSeat: db.prepare(`UPDATE seats SET status = 'SOLD', held_by_cart_id = NULL WHERE seat_id = ?`),
    commitCart: db.prepare(`UPDATE carts SET status = 'COMMITTED' WHERE cart_id = ?`),
    insertTicket: db.prepare(
      `INSERT INTO tickets (ticket_id, order_id, event_id, seat_id, membership_id, holder_name, entry_gate,
                            barcode_type, barcode_format, barcode_secret, rotation_interval_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ROTATING', 'PDF417', ?, ?)`,
    ),
    ticketsForOrder: db.prepare(
      `SELECT t.ticket_id, t.seat_id, s.section, s.row_label, s.seat_number
       FROM tickets t JOIN seats s ON s.seat_id = t.seat_id WHERE t.order_id = ? ${SEAT_ORDER}`,
    ),
    ticketById: db.prepare(
      `SELECT t.*, e.event_name, e.starts_at, v.name AS venue_name, v.city, s.section, s.row_label, s.seat_number
       FROM tickets t
       JOIN events e ON e.event_id = t.event_id
       JOIN venues v ON v.venue_id = e.venue_id
       JOIN seats  s ON s.seat_id  = t.seat_id
       WHERE t.ticket_id = ?`,
    ),
    touchEvent: db.prepare(`UPDATE events SET last_updated = ? WHERE event_id = ?`),
    expiredCarts: db.prepare(`SELECT cart_id, event_id FROM carts WHERE status IN ('OPEN','BILLING_ATTACHED') AND hold_expires_at <= ?`),
    releaseSeats: db.prepare(`UPDATE seats SET status = 'AVAILABLE', held_by_cart_id = NULL WHERE held_by_cart_id = ? AND status = 'HELD'`),
    expireCart: db.prepare(`UPDATE carts SET status = 'EXPIRED' WHERE cart_id = ?`),
  };
  /* ───────────── helpers ───────────── */
  /** Lazily expires carts whose hold has lapsed and returns their seats to inventory. */
  const releaseExpiredHolds = db.transaction((nowIso: string) => {
    const expired = sql.expiredCarts.all(nowIso) as Array<{ cart_id: string; event_id: string }>;
    for (const c of expired) {
      sql.releaseSeats.run(c.cart_id);
      sql.expireCart.run(c.cart_id);
      sql.touchEvent.run(nowIso, c.event_id);
    }
  });
  function requireEvent(eventId: string): EventRow {
    const event = sql.event.get(eventId) as EventRow | undefined;
    if (!event) throw new HttpError(404, `Event '${eventId}' not found`, 'EVENT_NOT_FOUND');
    return event;
  }
  function requireCart(cartId: string, req: Request): CartRow {
    const cart = sql.cartById.get(cartId) as CartRow | undefined;
    if (!cart || cart.partner_id !== req.header('x-partner-id')) {
      throw new HttpError(404, `Cart '${cartId}' not found`, 'CART_NOT_FOUND');
    }
    return cart;
  }
  function assertMutable(cart: CartRow) {
    if (cart.status === 'EXPIRED') {
      throw new HttpError(410, 'Seat hold has expired', 'HOLD_EXPIRED', { cartId: cart.cart_id });
    }
    if (cart.status === 'COMMITTED' || cart.status === 'CANCELLED') {
      throw new HttpError(409, `Cart is already ${cart.status.toLowerCase()}`, 'CART_CLOSED', { cartId: cart.cart_id });
    }
  }
  function toVendorSeat(s: SeatRow): VendorSeat {
    const seat: VendorSeat = {
      seatId: s.seat_id, section: s.section, row: s.row_label, seatNumber: s.seat_number,
      status: s.status, priceLevelId: s.price_level_id,
    };
    if (s.attributes) seat.attributes = JSON.parse(s.attributes) as string[];
    if (s.general_admission) seat.generalAdmission = true;
    return seat;
  }
  function toVendorCart(cart: CartRow): VendorCart {
    const { currency } = requireEvent(cart.event_id);
    const items = sql.cartItems.all(cart.cart_id) as CartItemRow[];
    const subtotal = items.reduce((sum, i) => sum + i.price_cents, 0);
    const fees = items.reduce((sum, i) => sum + i.fees_cents, 0);
    return {
      cartId: cart.cart_id,
      eventId: cart.event_id,
      status: cart.status,
      items: items.map((i) => ({
        seatId: i.seat_id, section: i.section, row: i.row_label, seatNumber: i.seat_number,
        priceLevelId: i.price_level_id, price: toMoney(i.price_cents, currency), fees: toMoney(i.fees_cents, currency),
      })),
      holdExpiresAt: cart.hold_expires_at,
      subtotal: toMoney(subtotal, currency),
      fees: toMoney(fees, currency),
      total: toMoney(subtotal + fees, currency),
    };
  }
  function toVendorOrder(order: OrderRow, currency: string): VendorOrder {
    const tickets = sql.ticketsForOrder.all(order.order_id) as Array<{ ticket_id: string; seat_id: string; section: string; row_label: string; seat_number: string }>;
    return {
      orderId: order.order_id,
      cartId: order.cart_id,
      eventId: order.event_id,
      status: order.status,
      tickets: tickets.map((t) => ({ ticketId: t.ticket_id, seatId: t.seat_id, section: t.section, row: t.row_label, seatNumber: t.seat_number })),
      total: toMoney(order.total_cents, currency),
      purchasedAt: order.purchased_at,
    };
  }
  function validateBilling(b: any): string[] {
    const problems: string[] = [];
    const required = (v: unknown, name: string) => {
      if (typeof v !== 'string' || !v.trim()) problems.push(`${name} is required`);
    };
    required(b?.customer?.firstName, 'customer.firstName');
    required(b?.customer?.lastName, 'customer.lastName');
    required(b?.customer?.email, 'customer.email');
    required(b?.address?.line1, 'address.line1');
    required(b?.address?.city, 'address.city');
    required(b?.address?.region, 'address.region');
    required(b?.address?.postalCode, 'address.postalCode');
    required(b?.address?.country, 'address.country');
    required(b?.payment?.paymentToken, 'payment.paymentToken');
    if (!['CARD', 'WALLET'].includes(b?.payment?.method)) problems.push('payment.method must be CARD or WALLET');
    if (b?.deliveryMethod !== 'MOBILE') problems.push("deliveryMethod must be 'MOBILE'");
    return problems;
  }
  const gateFor = (section: string) =>
    section.startsWith('1') ? 'Gate A' : section.startsWith('2') ? 'Gate C' : section === 'VIP' ? 'VIP Entrance' : 'North Gate';
  /* ───────────── app ───────────── */
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use(requestLog('ticket-vendor'));
  app.use(simulatedLatency);
  const v1 = express.Router();
  // Partner credentials, as sent by TicketVendorClient
  v1.use((req, _res, next) => {
    if (req.header('x-api-key') !== demoConfig.vendorApiKey || req.header('x-partner-id') !== demoConfig.vendorPartnerId) {
      return next(new HttpError(401, 'Invalid partner credentials', 'UNAUTHORIZED'));
    }
    next();
  });
  v1.use((_req, _res, next) => {
    releaseExpiredHolds(new Date().toISOString());
    next();
  });
  /** 1. GET /v1/events/:eventId/availability */
  v1.get('/events/:eventId/availability', (req, res) => {
    const event = requireEvent(req.params.eventId);
    const seats = sql.seatsForEvent.all(event.event_id) as SeatRow[];
    const levels = sql.priceLevelsForEvent.all(event.event_id) as PriceLevelRow[];
    const body: VendorAvailabilityResponse = {
      eventId: event.event_id,
      eventName: event.event_name,
      startsAt: event.starts_at,
      venue: { venueId: event.venue_id, name: event.venue_name, city: event.city, country: event.country },
      seats: seats.map(toVendorSeat),
      priceLevels: levels.map((p) => ({
        priceLevelId: p.price_level_id,
        name: p.name,
        faceValue: toMoney(p.face_cents, event.currency),
        fees: toMoney(p.fees_cents, event.currency),
        total: toMoney(p.face_cents + p.fees_cents, event.currency),
      })),
      lastUpdated: event.last_updated,
    };
    res.json(body);
  });
  /** 3. POST /v1/carts: creates a cart and places a timed hold on the seats. */
  v1.post('/carts', (req, res) => {
    const membershipId = req.header('x-membership-id');
    if (!membershipId) throw new HttpError(400, 'X-Membership-Id header is required', 'MISSING_MEMBERSHIP_ID');
    const body = req.body as Partial<VendorCreateCartRequest> | undefined;
    if (
      typeof body?.eventId !== 'string' ||
      !Array.isArray(body.seatIds) || body.seatIds.length === 0 ||
      !body.seatIds.every((s) => typeof s === 'string')
    ) {
      throw new HttpError(400, 'eventId and a non-empty seatIds array are required', 'INVALID_CART_REQUEST');
    }
    const holdSeconds = body.holdDurationSeconds ?? 300;
    if (!Number.isInteger(holdSeconds) || holdSeconds < 1 || holdSeconds > MAX_HOLD_SECONDS) {
      throw new HttpError(422, `holdDurationSeconds must be an integer between 1 and ${MAX_HOLD_SECONDS}`, 'INVALID_HOLD_DURATION');
    }
    const idempotencyKey = req.header('idempotency-key') ?? null;
    if (idempotencyKey) {
      const existing = sql.cartByIdempotencyKey.get(idempotencyKey) as CartRow | undefined;
      if (existing) return res.status(200).json(toVendorCart(existing));
    }
    const event = requireEvent(body.eventId);
    const seatIds = [...new Set(body.seatIds)];
    const cartId = newId('cart');
    const now = new Date();
    db.transaction(() => {
      const rows = seatIds.map((id) => ({ id, seat: sql.pricedSeat.get(id, event.event_id) as PricedSeatRow | undefined }));
      const unknown = rows.filter((r) => !r.seat).map((r) => r.id);
      if (unknown.length) {
        throw new HttpError(404, `Unknown seat(s) for ${event.event_id}: ${unknown.join(', ')}`, 'SEAT_NOT_FOUND', { seatIds: unknown });
      }
      const unavailable = rows.filter((r) => r.seat!.status !== 'AVAILABLE').map((r) => ({ seatId: r.id, status: r.seat!.status }));
      if (unavailable.length) {
        throw new HttpError(409, `Seat(s) no longer available: ${unavailable.map((u) => u.seatId).join(', ')}`, 'SEATS_UNAVAILABLE', { seats: unavailable });
      }
      sql.insertCart.run({
        cart_id: cartId,
        event_id: event.event_id,
        membership_id: membershipId,
        partner_id: req.header('x-partner-id'),
        partner_reference: body.partnerReference ?? null,
        hold_expires_at: new Date(now.getTime() + holdSeconds * 1000).toISOString(),
        idempotency_key: idempotencyKey,
        created_at: now.toISOString(),
      });
      for (const { seat } of rows) {
        sql.holdSeat.run(cartId, seat!.seat_id);
        sql.insertCartItem.run(cartId, seat!.seat_id, seat!.face_cents, seat!.fees_cents);
      }
      sql.touchEvent.run(now.toISOString(), event.event_id);
    })();
    res.status(201).json(toVendorCart(sql.cartById.get(cartId) as CartRow));
  });
  /** 4. PUT /v1/carts/:cartId/billing */
  v1.put('/carts/:cartId/billing', (req, res) => {
    const cart = requireCart(req.params.cartId, req);
    assertMutable(cart);
    const problems = validateBilling(req.body);
    if (problems.length) {
      throw new HttpError(422, `Invalid billing request: ${problems.join('; ')}`, 'INVALID_BILLING', { problems });
    }
    const billing = req.body as VendorBillingRequest;
    if (!billing.payment.paymentToken.startsWith('tok_')) {
      throw new HttpError(422, 'paymentToken is not a recognised processor token', 'INVALID_PAYMENT_TOKEN');
    }
    sql.attachBilling.run(JSON.stringify(billing), cart.cart_id);
    res.json(toVendorCart(sql.cartById.get(cart.cart_id) as CartRow));
  });
  /** 5. PUT /v1/carts/:cartId/commit: converts holds into a confirmed order. */
  v1.put('/carts/:cartId/commit', (req, res) => {
    const key = req.header('idempotency-key');
    if (!key) throw new HttpError(400, 'Idempotency-Key header is required', 'MISSING_IDEMPOTENCY_KEY');
    const cart = requireCart(req.params.cartId, req);
    const event = requireEvent(cart.event_id);
    // Idempotent replay: same key returns the original order.
    const replay = sql.orderByIdempotencyKey.get(key) as OrderRow | undefined;
    if (replay) {
      if (replay.cart_id !== cart.cart_id) {
        throw new HttpError(409, 'Idempotency-Key was already used for a different cart', 'IDEMPOTENCY_KEY_REUSED');
      }
      return res.json(toVendorOrder(replay, event.currency));
    }
    assertMutable(cart);
    if (cart.status !== 'BILLING_ATTACHED' || !cart.billing_json) {
      throw new HttpError(409, 'Billing must be attached before the cart can be committed', 'BILLING_REQUIRED');
    }
    const billing = JSON.parse(cart.billing_json) as VendorBillingRequest;
    const items = sql.cartItems.all(cart.cart_id) as CartItemRow[];
    const totalCents = items.reduce((sum, i) => sum + i.price_cents + i.fees_cents, 0);
    const now = new Date().toISOString();
    // Simulated processor decline. Nothing is persisted, so the cart can be re-billed and retried.
    if (billing.payment.paymentToken.startsWith('tok_decline')) {
      const failed: VendorOrder = {
        orderId: newId('ord'), cartId: cart.cart_id, eventId: cart.event_id, status: 'FAILED',
        tickets: [], total: toMoney(totalCents, event.currency), purchasedAt: now,
      };
      return res.json(failed);
    }
    const orderId = newId('ord');
    const holderName = `${billing.customer.firstName} ${billing.customer.lastName}`;
    db.transaction(() => {
      sql.insertOrder.run(orderId, cart.cart_id, cart.event_id, cart.membership_id, totalCents, key, now);
      for (const item of items) {
        sql.sellSeat.run(item.seat_id);
        sql.insertTicket.run(
          newId('tkt'), orderId, cart.event_id, item.seat_id, cart.membership_id, holderName,
          gateFor(item.section), randomBytes(20).toString('hex'), DEFAULT_ROTATION_SECONDS,
        );
      }
      sql.commitCart.run(cart.cart_id);
      sql.touchEvent.run(now, cart.event_id);
    })();
    res.json(toVendorOrder(sql.orderById.get(orderId) as OrderRow, event.currency));
  });
  /** 6. GET /v1/tickets/:ticketId: scoped to the purchasing member. */
  v1.get('/tickets/:ticketId', (req, res) => {
    const membershipId = req.header('x-membership-id');
    if (!membershipId) throw new HttpError(400, 'X-Membership-Id header is required', 'MISSING_MEMBERSHIP_ID');
    const t = sql.ticketById.get(req.params.ticketId) as TicketRow | undefined;
    // Same 404 for "doesn't exist" and "belongs to someone else", so ticket IDs can't be probed.
    if (!t || t.membership_id !== membershipId) {
      throw new HttpError(404, `Ticket '${req.params.ticketId}' not found`, 'TICKET_NOT_FOUND');
    }
    const barcode: VendorBarcode =
      t.barcode_type === 'ROTATING'
        ? {
            type: 'ROTATING',
            secret: t.barcode_secret!,
            format: t.barcode_format,
            ...(t.rotation_interval_seconds ? { rotationIntervalSeconds: t.rotation_interval_seconds } : {}),
          }
        : { type: 'STATIC', value: t.barcode_value!, format: t.barcode_format };
    const body: VendorTicket = {
      ticketId: t.ticket_id,
      orderId: t.order_id,
      eventId: t.event_id,
      eventName: t.event_name,
      startsAt: t.starts_at,
      venue: { name: t.venue_name, city: t.city },
      seat: { section: t.section, row: t.row_label, seatNumber: t.seat_number },
      holderName: t.holder_name,
      ...(t.entry_gate ? { entryGate: t.entry_gate } : {}),
      barcode,
    };
    res.json(body);
  });
  app.use('/v1', v1);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}