import type { EventAvailabilityResponse, MembershipStatus, Money } from "./bridgeTypes";

export interface MemberInfo {
  email: string;
  membershipId: string;
  displayName?: string;
  status: MembershipStatus;
  tierId: string;
  tierName: string;
  eligibleToPurchase: boolean;
  reason?: string;
}
export interface LockedCart {
  cartId: string; eventId: string; membershipId: string;
  seatIds: string[]; holdExpiresAt: string; total: Money;
}
export interface PlacedOrder { orderId: string; eventId: string; ticketIds: string[]; total: Money }

export interface PurchaseSession {
  member?: MemberInfo;                       // from 2A
  eventId?: string;                          // from 2B
  availability?: EventAvailabilityResponse;  // from 2B
  cart?: LockedCart;                         // from 2C
  order?: PlacedOrder;                       // from 2D
}

const KEY = "weverse-purchase-session";

export function getSession(): PurchaseSession {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as PurchaseSession;
  } catch {
    return {};
  }
}

export function updateSession(patch: Partial<PurchaseSession>): PurchaseSession {
  const next = { ...getSession(), ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(next)); // undefined keys are dropped
  return next;
}