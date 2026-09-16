import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { ticketVendorClient } from '../clients/ticketVendorClient.ts';
import { AppError } from '../errors.ts';
import type { MembershipRecord } from '../types/membership.ts';
import type { VendorBillingRequest, VendorCart } from '../types/vendor.ts';
import type { BillingResponse, CommitResponse, SeatLockResponse } from '../types/api.ts';
const DEFAULT_MAX_TICKETS_PER_ORDER = 8;
export interface SeatLockInput {
  eventId: string;
  seatIds: string[];
}
/** 3. Seat lock — creates a vendor cart that holds the seats for SEAT_HOLD_SECONDS (5 min). */
export async function lockSeats(member: MembershipRecord, input: SeatLockInput): Promise<SeatLockResponse> {
  const maxSeats = member.tier.maxTicketsPerOrder ?? DEFAULT_MAX_TICKETS_PER_ORDER;
  if (input.seatIds.length > maxSeats) {
    throw new AppError(422, 'SEAT_LIMIT_EXCEEDED',
      `${member.tier.name} members may hold at most ${maxSeats} seats per order`,
      { requested: input.seatIds.length, max: maxSeats });
  }
  const cart = await ticketVendorClient.createCart(
    {
      eventId: input.eventId,
      seatIds: [...new Set(input.seatIds)],
      holdDurationSeconds: config.SEAT_HOLD_SECONDS,
      partnerReference: `fanclub:${member.membershipId}:${randomUUID()}`,
    },
    member.membershipId,
  );
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
