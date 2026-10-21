import { bridge, BridgeError } from "./bridgeClient";
import type { BillingRequest, EventAvailabilityResponse, MobileTicketResponse, SeatLockResponse } from "./bridgeTypes";
import {
  getSession, updateSession,
  type LockedCart, type MemberInfo, type PlacedOrder,
} from "./purchaseSession";

/** Demo billing profile. The page shows a saved wallet selected → WALLET. */
const DEMO_ADDRESS = {
  line1: "1 MetLife Stadium Dr", city: "East Rutherford", region: "NJ", postalCode: "07073", country: "US",
};
const DEMO_PAYMENT = { paymentToken: "tok_weversepay_demo", method: "WALLET" as const };

function configuredEmail(): string {
  const email = __EMAIL_ADDRESS__.trim();
  if (!email) throw new Error("EMAIL_ADDRESS is not set in .env (restart the Vite dev server after editing it)");
  return email;
}

/* ------------- membership validation ------------- */

/** POST /membership/verify for EMAIL_ADDRESS; caches the member in the session. */
export async function verifyMembership(): Promise<MemberInfo> {
  const email = configuredEmail();
  let res;
  try {
    res = await bridge.verifyMembership(email);
  } catch (err) {
    if (err instanceof BridgeError && err.status === 404) {
      throw new Error(`No fan-club membership found for ${email}`);
    }
    throw err;
  }
  const member: MemberInfo = {
    email,
    membershipId: res.membershipId!,
    displayName: res.displayName,
    status: res.status!,
    tierId: res.tier!.tierId,
    tierName: res.tier!.name,
    maxTicketsPerOrder: res.tier!.maxTicketsPerOrder,
    eligibleToPurchase: res.eligibleToPurchase,
    reason: res.reason,
  };
  updateSession({ member });
  return member;
}

/** The session's member, if it was verified for the currently configured email. */
export function cachedMember(): MemberInfo | undefined {
  const cached = getSession().member;
  return cached && cached.email === __EMAIL_ADDRESS__.trim() ? cached : undefined;
}

/** Cached member if there is one for the configured email; otherwise verify now. */
async function currentMember(): Promise<MemberInfo> {
  return cachedMember() ?? verifyMembership();
}

/**
 * Throws unless EMAIL_ADDRESS belongs to an active membership. Tier and presale access
 * are not checked. The member's id is what ties the cart, order, ticket and rotating
 * barcode to the logged-in fan. Used by 2B's "Buy Tickets", the route guard and every
 * purchase action.
 */
export async function requireMember(): Promise<MemberInfo> {
  const member = await currentMember();
  if (!member.eligibleToPurchase) {
    throw new Error(member.reason ?? "This membership is not eligible to purchase tickets");
  }
  return member;
}

/* ------------- 2B / 2C: live availability ------------- */

export async function loadAvailability(eventId: string): Promise<EventAvailabilityResponse> {
  const availability = await bridge.getAvailability(eventId);
  updateSession({ eventId, availability });
  return availability;
}

/* ------------- 2C → 2D: hold seats (assigned) or tickets (general admission) ------------- */

function toLockedCart(lock: SeatLockResponse, member: MemberInfo): LockedCart {
  return {
    cartId: lock.cartId,
    eventId: lock.eventId,
    membershipId: member.membershipId,
    seats: lock.seats.map((s) => ({
      seatId: s.seatId, section: s.section, row: s.row, seatNumber: s.seatNumber, total: s.total,
    })),
    subtotal: lock.totals.subtotal,
    fees: lock.totals.fees,
    total: lock.totals.total,
    holdExpiresAt: lock.holdExpiresAt,
  };
}

/** This session's hold for the event and member, if it still has more than 30 s left. */
function liveHold(eventId: string, member: MemberInfo): LockedCart | undefined {
  const cart = getSession().cart;
  return cart &&
    cart.eventId === eventId &&
    cart.membershipId === member.membershipId &&
    Date.parse(cart.holdExpiresAt) - Date.now() > 30_000
    ? cart
    : undefined;
}

/** Assigned seating: hold these exact seats (re-uses the current hold if it is for the same seats). */
export async function lockSeats(eventId: string, seatIds: string[]): Promise<LockedCart> {
  const member = await requireMember();
  const existing = liveHold(eventId, member);
  if (
    existing &&
    existing.seats.length === seatIds.length &&
    seatIds.every((id) => existing.seats.some((s) => s.seatId === id))
  ) {
    return existing;
  }
  const cart = toLockedCart(await bridge.lockSeats(member.membershipId, eventId, seatIds), member);
  updateSession({ cart, order: undefined });
  return cart;
}

/**
 * General admission: hold `quantity` tickets of one type (section); the bridge picks them.
 * Re-uses the current hold if it is for the same type and quantity.
 */
export async function lockTickets(eventId: string, section: string, quantity: number): Promise<LockedCart> {
  const member = await requireMember();
  const existing = liveHold(eventId, member);
  if (existing && existing.seats.length === quantity && existing.seats.every((s) => s.section === section)) {
    return existing;
  }
  const cart = toLockedCart(await bridge.lockTickets(member.membershipId, eventId, section, quantity), member);
  updateSession({ cart, order: undefined });
  return cart;
}

/* ------------- 2D → 2E: billing + commit ------------- */

function buildBilling(member: MemberInfo): BillingRequest {
  const [firstName, ...rest] = (member.displayName ?? "Fan Member").trim().split(/\s+/);
  return {
    customer: { firstName, lastName: rest.join(" ") || "Member", email: member.email },
    address: DEMO_ADDRESS,
    payment: DEMO_PAYMENT,
  };
}

export async function completePurchase(): Promise<PlacedOrder> {
  const member = await requireMember();
  const { cart } = getSession();
  if (!cart) throw new Error("No seats are locked — go back and reserve seats first");
  if (Date.parse(cart.holdExpiresAt) <= Date.now()) {
    updateSession({ cart: undefined });
    throw new Error("Your seat hold expired — go back and reserve seats again");
  }

  await bridge.attachBilling(cart.cartId, buildBilling(member));
  const res = await bridge.commitCart(cart.cartId, `weverse-${cart.cartId}`);

  const order: PlacedOrder = {
    orderId: res.orderId,
    eventId: cart.eventId,
    ticketIds: res.tickets.map((t) => t.ticketId),
    total: res.total,
  };
  updateSession({ cart: undefined, order });
  return order;
}

/* ------------- 2E: mobile ticket ------------- */

export async function fetchMobileTicket(): Promise<MobileTicketResponse> {
  const member = await currentMember();
  const { order } = getSession();
  if (!order?.ticketIds.length) throw new Error("No purchased tickets found in this session");
  return bridge.getMobileTicket(order.ticketIds[0], member.membershipId);
}