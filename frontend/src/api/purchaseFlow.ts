import { bridge, BridgeError } from "./bridgeClient";
import type { BillingRequest, EventAvailabilityResponse, MobileTicketResponse } from "./bridgeTypes";
import {
  getSession, updateSession,
  type LockedCart, type MemberInfo, type PlacedOrder,
} from "./purchaseSession";

/** Demo billing profile. The page shows "Saved Weverse Pay" selected → WALLET. */
const DEMO_ADDRESS = {
  line1: "1 MetLife Stadium Dr", city: "East Rutherford", region: "NJ", postalCode: "07073", country: "US",
};
const DEMO_PAYMENT = { paymentToken: "tok_weversepay_demo", method: "WALLET" as const };

function configuredEmail(): string {
  const email = __EMAIL_ADDRESS__.trim();
  if (!email) throw new Error("EMAIL_ADDRESS is not set in .env (restart the Vite dev server after editing it)");
  return email;
}

/* ───────────── 2A: verify membership ───────────── */

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
    presaleAccess: res.tier?.presaleAccess === true, // NEW — null/undefined (e.g. Basic) = no access
    eligibleToPurchase: res.eligibleToPurchase,
    reason: res.reason,
  };
  updateSession({ member });
  return member;
}

/** Presale eligible = tier includes presale access AND the membership is ACTIVE. */
export function hasPresaleAccess(m: MemberInfo): boolean {
  return m.presaleAccess === true && m.eligibleToPurchase;
}

/** Cached member if it's for the configured email and has all current fields; otherwise re-verify. */
async function currentMember(): Promise<MemberInfo> {
  const cached = getSession().member;
  if (
    cached &&
    cached.email === configuredEmail() &&
    typeof cached.presaleAccess === "boolean" // entries cached before presaleAccess existed get refreshed
  ) {
    return cached;
  }
  return verifyMembership();
}

/** Throws unless the member may use the presale flow. Used by the route guard and every purchase action. */
export async function requirePresaleMember(): Promise<MemberInfo> {
  const member = await currentMember();
  if (!member.eligibleToPurchase) {
    throw new Error(member.reason ?? "This membership is not eligible to purchase tickets");
  }
  if (!member.presaleAccess) {
    throw new Error(`${member.tierName} tier does not include presale access`);
  }
  return member;
}

/** Kept so existing calls in lockSeats / completePurchase need no changes. */
const eligibleMember = requirePresaleMember;

/* ───────────── 2B / 2C: live availability ───────────── */

export async function loadAvailability(eventId: string): Promise<EventAvailabilityResponse> {
  const availability = await bridge.getAvailability(eventId);
  updateSession({ eventId, availability });
  return availability;
}

/* ───────────── 2C → 2D: lock the chosen seats ───────────── */

export async function lockSeats(eventId: string, seatIds: string[]): Promise<LockedCart> {
  const member = await eligibleMember();

  // Re-use the current hold if it's the same seats and still has time left
  const existing = getSession().cart;
  const sameSeats =
    !!existing &&
    existing.seats.length === seatIds.length &&
    seatIds.every((id) => existing.seats.some((s) => s.seatId === id));
  if (
    existing &&
    sameSeats &&
    existing.eventId === eventId &&
    existing.membershipId === member.membershipId &&
    Date.parse(existing.holdExpiresAt) - Date.now() > 30_000
  ) {
    return existing;
  }

  const lock = await bridge.lockSeats(member.membershipId, eventId, seatIds);
  const cart: LockedCart = {
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
  updateSession({ cart, order: undefined });
  return cart;
}

/* ───────────── 2D → 2E: billing + commit ───────────── */

function buildBilling(member: MemberInfo): BillingRequest {
  const [firstName, ...rest] = (member.displayName ?? "ARMY Member").trim().split(/\s+/);
  return {
    customer: { firstName, lastName: rest.join(" ") || "Member", email: member.email },
    address: DEMO_ADDRESS,
    payment: DEMO_PAYMENT,
  };
}

export async function completePurchase(): Promise<PlacedOrder> {
  const member = await eligibleMember();
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

/* ───────────── 2E: mobile ticket ───────────── */

export async function fetchMobileTicket(): Promise<MobileTicketResponse> {
  const member = await currentMember();
  const { order } = getSession();
  if (!order?.ticketIds.length) throw new Error("No purchased tickets found in this session");
  return bridge.getMobileTicket(order.ticketIds[0], member.membershipId);
}