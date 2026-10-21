import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { ticketVendorClient } from '../clients/ticketVendorClient.ts';
import { AppError } from '../errors.ts';
import { isGeneralAdmissionEvent } from './availabilityService.ts';
import type { MembershipRecord } from '../types/membership.ts';
import type { VendorBillingRequest, VendorCart } from '../types/vendor.ts';
import type { BillingResponse, CommitResponse, SeatLockResponse } from '../types/api.ts';

const DEFAULT_MAX_TICKETS_PER_ORDER = 8;
/** GA: how often to re-pick tickets when another buyer takes one between our read and the hold. */
const GA_LOCK_ATTEMPTS = 3;

/** Exactly one of seatIds (assigned seating) or quantity (general admission); enforced by the route schema. */
export interface SeatLockInput {
  eventId: string;
  seatIds?: string[];
  quantity?: number;
}

/**
 * 3. Seat lock — creates a vendor cart that holds the seats for SEAT_HOLD_SECONDS (5 min).
 * Assigned seating locks the given seatIds. General admission locks `quantity` tickets
 * chosen by the bridge, since GA tickets are interchangeable.
 */
export async function lockSeats(member: MembershipRecord, input: SeatLockInput): Promise<SeatLockResponse> {
  const requested = input.seatIds?.length ?? input.quantity ?? 0;
  if (requested < 1) {
    throw new AppError(400, 'INVALID_LOCK_REQUEST', 'Provide seatIds or a quantity of at least 1');
  }
  const maxSeats = member.tier.maxTicketsPerOrder ?? DEFAULT_MAX_TICKETS_PER_ORDER;
  if (requested > maxSeats) {
    throw new AppError(422, 'SEAT_LIMIT_EXCEEDED',
      `${member.tier.name} members may hold at most ${maxSeats} seats per order`,
      { requested, max: maxSeats });
  }

  // Presale events are limited to tiers with presale access; general-sale events are open to
  // any member who passes requireMembership. The sale type is event data from the ticket vendor,
  // and anything other than an explicit GENERAL is treated as presale.
  // Only looked up when it matters, so presale-tier members skip the extra vendor call.
  if (member.tier.presaleAccess !== true) {
    const event = await ticketVendorClient.getEvent(input.eventId);
    if (event.saleType !== 'GENERAL') {
      throw new AppError(403, 'PRESALE_ACCESS_REQUIRED',
        `${event.eventName} is a presale event and ${member.tier.name} members do not have presale access`);
    }
  }

  const cart = input.seatIds
    ? await createHold(member, input.eventId, [...new Set(input.seatIds)])
    : await holdGeneralAdmission(member, input.eventId, requested);

  return {
    cartId: cart.cartId,
    eventId: cart.eventId,
    status: cart.status,
    membershipId: member.membershipId,
    seats: cart.items.map((i) => ({
      seatId: i.seatId,
      section: i.section,
      row: i.row,
      seatNumber: i.seatNumber,
      total: { amount: i.price.amount + i.fees.amount, currency: i.price.currency },
    })),
    holdExpiresAt: cart.holdExpiresAt,
    holdSecondsRemaining: secondsRemaining(cart),
    totals: { subtotal: cart.subtotal, fees: cart.fees, total: cart.total },
  };
}

function createHold(member: MembershipRecord, eventId: string, seatIds: string[]): Promise<VendorCart> {
  return ticketVendorClient.createCart(
    {
      eventId,
      seatIds,
      holdDurationSeconds: config.SEAT_HOLD_SECONDS,
      partnerReference: `fanclub:${member.membershipId}:${randomUUID()}`,
    },
    member.membershipId,
  );
}

/**
 * The vendor only holds specific seat ids, so for GA the bridge reads the live inventory,
 * picks `quantity` random available tickets and holds them. If another buyer takes one
 * in between (vendor 409), it re-reads and tries different tickets.
 */
async function holdGeneralAdmission(member: MembershipRecord, eventId: string, quantity: number): Promise<VendorCart> {
  for (let attempt = 1; attempt <= GA_LOCK_ATTEMPTS; attempt++) {
    const event = await ticketVendorClient.getEventAvailability(eventId);
    if (!isGeneralAdmissionEvent(event.seats)) {
      throw new AppError(422, 'NOT_GENERAL_ADMISSION',
        `${event.eventName} has assigned seating; lock specific seatIds instead of a quantity`);
    }
    const available = event.seats.filter((s) => s.status === 'AVAILABLE').map((s) => s.seatId);
    if (available.length < quantity) {
      throw new AppError(409, 'TICKETS_UNAVAILABLE',
        available.length === 0
          ? `${event.eventName} is sold out`
          : `Only ${available.length} ticket${available.length === 1 ? ' is' : 's are'} left for ${event.eventName}`,
        { requested: quantity, available: available.length });
    }
    try {
      return await createHold(member, eventId, pickRandom(available, quantity));
    } catch (err) {
      if (!isSeatConflict(err)) throw err;
    }
  }
  throw new AppError(409, 'TICKETS_UNAVAILABLE', 'Tickets are selling fast and none could be held; please try again');
}

/** The vendor answers 409 SEATS_UNAVAILABLE when a seat was taken between our read and the hold. */
function isSeatConflict(err: unknown): boolean {
  const e = err as { status?: unknown; statusCode?: unknown; code?: unknown } | null;
  return e?.status === 409 || e?.statusCode === 409 || e?.code === 'SEATS_UNAVAILABLE';
}

function pickRandom<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
/** 4. Attach billing info to the cart created by the seat lock. */
export async function attachBilling(cartId: string, billing: VendorBillingRequest): Promise<BillingResponse> {
  const cart = await ticketVendorClient.updateBilling(cartId, billing);
  assertCartOpen(cart);
  return {
    cartId: cart.cartId,
    status: cart.status,
    holdExpiresAt: cart.holdExpiresAt,
    holdSecondsRemaining: secondsRemaining(cart),
    total: cart.total,
  };
}
/** 5. Commit — finalises the purchase; the vendor releases temp holds and marks seats sold. */
export async function commitCart(cartId: string, idempotencyKey?: string): Promise<CommitResponse> {
  const order = await ticketVendorClient.commitCart(cartId, idempotencyKey ?? `commit:${cartId}`);
  if (order.status === 'FAILED') {
    throw new AppError(402, 'PAYMENT_FAILED', 'The ticket vendor could not complete the payment', { orderId: order.orderId });
  }
  return {
    orderId: order.orderId,
    cartId: order.cartId,
    status: order.status,
    purchasedAt: order.purchasedAt,
    total: order.total,
    tickets: order.tickets.map((t) => ({
      ticketId: t.ticketId,
      section: t.section,
      row: t.row,
      seatNumber: t.seatNumber,
      mobileTicketUrl: `/tickets/${encodeURIComponent(t.ticketId)}`,
    })),
  };
}
function secondsRemaining(cart: VendorCart): number {
  return Math.max(0, Math.floor((new Date(cart.holdExpiresAt).getTime() - Date.now()) / 1000));
}
function assertCartOpen(cart: VendorCart): void {
  if (cart.status === 'EXPIRED' || secondsRemaining(cart) === 0) {
    throw new AppError(410, 'HOLD_EXPIRED', 'The seat hold for this cart has expired; lock seats again', { cartId: cart.cartId });
  }
  if (cart.status === 'COMMITTED' || cart.status === 'CANCELLED') {
    throw new AppError(409, 'CART_CLOSED', `Cart is already ${cart.status.toLowerCase()}`, { cartId: cart.cartId });
  }
}
