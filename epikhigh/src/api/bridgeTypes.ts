export interface Money { amount: number; currency: string }

export type MembershipStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED" | "PENDING";
export interface MembershipTier {
  tierId: string; name: string; level: number; maxTicketsPerOrder?: number; presaleAccess?: boolean;
}
export interface MembershipVerificationResponse {
  verified: boolean;
  membershipId?: string;
  displayName?: string;
  status?: MembershipStatus;
  tier?: MembershipTier;
  memberSince?: string;
  renewsAt?: string;
  eligibleToPurchase: boolean;
  reason?: string;
}

export interface AvailableSeat {
  seatId: string; section: string; row: string; seatNumber: string; attributes: string[];
  price: { level: string; faceValue: Money; fees: Money; total: Money };
}
export interface SectionAvailability {
  section: string; availableCount: number;
  priceRange: { min: Money; max: Money } | null;
  seats: AvailableSeat[];
}
export interface EventAvailabilityResponse {
  eventId: string; eventName: string; startsAt: string;
  venue: { name: string; city: string; country: string };
  totals: { available: number; held: number; sold: number };
  sections: SectionAvailability[];
  lastUpdated: string;
}

export interface SeatLockResponse {
  cartId: string; eventId: string; status: string; membershipId: string;
  seats: Array<{ seatId: string; section: string; row: string; seatNumber: string; total: Money }>;
  holdExpiresAt: string; holdSecondsRemaining: number;
  totals: { subtotal: Money; fees: Money; total: Money };
}

export interface BillingRequest {
  customer: { firstName: string; lastName: string; email: string; phone?: string };
  address: { line1: string; line2?: string; city: string; region: string; postalCode: string; country: string };
  payment: { paymentToken: string; method: "CARD" | "WALLET" };
}
export interface BillingResponse {
  cartId: string; status: string; holdExpiresAt: string; holdSecondsRemaining: number; total: Money;
}

export interface CommitResponse {
  orderId: string; cartId: string; status: string; purchasedAt: string; total: Money;
  tickets: Array<{ ticketId: string; section: string; row: string; seatNumber: string; mobileTicketUrl: string }>;
}

export interface MobileTicketResponse {
  ticketId: string; orderId: string;
  event: { eventId: string; name: string; startsAt: string; venue: string; city: string };
  seat: { section: string; row: string; seatNumber: string };
  holderName: string; entryGate?: string;
  barcode: {
    format: "QR" | "PDF417"; value: string; rotating: boolean;
    rotatesEverySeconds?: number; validUntil?: string; nextRotationAt?: string;
  };
  refreshUrl: string;
}