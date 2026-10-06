import { bridge, BridgeError } from "./bridgeClient";
import type { BillingRequest, EventAvailabilityResponse, MobileTicketResponse } from "./bridgeTypes";
import { getSession, updateSession, type LockedCart, type MemberInfo, type PlacedOrder } from "./purchaseSession";

/** Seats hard-coded on page 2C: Section Floor A1, Row A, Seats 11–12. */
export const SELECTED_SEATS = { section: "FLOOR-A1", row: "A", seatNumbers: ["11", "12"] } as const;

/** Demo billing profile. The page shows "Saved Weverse Pay" selected → WALLET. Token must start with "tok_". */
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
  // The verify response already carries the tier object (id + name), so no second lookup is needed.
  const member: MemberInfo = {
    email,
    membershipId: res.membershipId!,
    displayName: res.displayName,
    status: res.status!,
    tierId: res.tier!.tierId,
    tierName: res.tier!.name,
    eligibleToPurchase: res.eligibleToPurchase,
    reason: res.reason,
  };
  updateSession({ member });
  return member;
}

/** Uses the cached member (if it matches .env), otherwise re-verifies. Handles refreshes on later pages. */
async function currentMember(): Promise<MemberInfo> {
  const cached = getSession().member;
  if (cached && cached.email === configuredEmail()) return cached;
  return verifyMembership();
}

async function eligibleMember(): Promise<MemberInfo> {
  const member = await currentMember();
  if (!member.eligibleToPurchase) {
    throw new Error(member.reason ?? "This membership is not eligible to purchase tickets");
  }
  return member;
}

/* ───────────── 2B → 2C: availability ───────────── */

export async function loadAvailability(eventId: string): Promise<EventAvailabilityResponse> {
  const availability = await bridge.getAvailability(eventId);
  updateSession({ eventId, availability });
  return availability;
}

/* ───────────── 2C → 2D: lock seats ───────────── */

function pickSeatIds(availability: EventAvailabilityResponse): string[] {
  const { section, row, seatNumbers } = SELECTED_SEATS;
  const sec = availability.sections.find((s) => s.section === section);
  if (!sec) throw new Error(`Section ${section} has no seats left for ${availability.eventName}`);

  const wanted = sec.seats.filter((s) => s.row === row && (seatNumbers as readonly string[]).includes(s.seatNumber));
  if (wanted.length === seatNumbers.length) return wanted.map((s) => s.seatId);

  // A11/A12 already sold or held (e.g. a previous demo run) → take the first free seats in the same section.
  if (sec.seats.length < seatNumbers.length) {
    throw new Error(`Only ${sec.seats.length} seat(s) left in ${section} for ${availability.eventName}`);
  }
  const fallback = sec.seats.slice(0, seatNumbers.length);
  console.warn(
    `[lock] ${row}${seatNumbers.join(", " + row)} unavailable; locking ${fallback.map((s) => s.row + s.seatNumber).join(", ")} instead`,
  );
  return fallback.map((s) => s.seatId);
}

export async function lockSelectedSeats(eventId: string): Promise<LockedCart> {
  const member = await eligibleMember();

  // Re-use a still-valid hold (e.g. user went back to 2C and clicked again)
  const existing = getSession().cart;
  if (
    existing &&
    existing.eventId === eventId &&
    existing.membershipId === member.membershipId &&
    Date.parse(existing.holdExpiresAt) - Date.now() > 30_000
  ) {
    return existing;
  }

  let availability = getSession().availability;
  if (!availability || availability.eventId !== eventId) availability = await loadAvailability(eventId);

  let lock;
  try {
    lock = await bridge.lockSeats(member.membershipId, eventId, pickSeatIds(availability));
  } catch (err) {
    if (!(err instanceof BridgeError && err.status === 409)) throw err;
    // Inventory changed since 2B → refresh once and retry
    availability = await loadAvailability(eventId);
    lock = await bridge.lockSeats(member.membershipId, eventId, pickSeatIds(availability));
  }

  const cart: LockedCart = {
    cartId: lock.cartId,
    eventId: lock.eventId,
    membershipId: member.membershipId,
    seatIds: lock.seats.map((s) => s.seatId),
    holdExpiresAt: lock.holdExpiresAt,
    total: lock.totals.total,
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
  // Deterministic key → a double-click / retry replays the same order instead of buying twice
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