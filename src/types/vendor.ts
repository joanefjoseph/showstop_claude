/**
 * Wire types for the ticket vendor's Partner API.
 * Adjust field names to the real vendor spec; everything else in the
 * service consumes these types rather than raw JSON.
 */
export interface Money {
  amount: number;   // minor units avoided for readability; e.g. 79.5
  currency: string; // ISO 4217
}
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'UNAVAILABLE';
export interface VendorSeat {
  seatId: string;
  section: string;
  row: string;
  seatNumber: string;
  status: SeatStatus;
  priceLevelId: string;
  attributes?: string[]; // e.g. "AISLE", "ADA", "OBSTRUCTED_VIEW"
  generalAdmission?: boolean;
}
export interface VendorPriceLevel {
  priceLevelId: string;
  name: string;
  faceValue: Money;
  fees: Money;
  total: Money;
}
export interface VendorAvailabilityResponse {
  eventId: string;
  eventName: string;
  startsAt: string; // ISO-8601
  venue: { venueId: string; name: string; city: string; country: string };
  seats: VendorSeat[];
  priceLevels: VendorPriceLevel[];
  lastUpdated: string;
}
export interface VendorCreateCartRequest {
  eventId: string;
  seatIds: string[];
  holdDurationSeconds: number;
  partnerReference?: string;
}
export type CartStatus = 'OPEN' | 'BILLING_ATTACHED' | 'COMMITTED' | 'EXPIRED' | 'CANCELLED';
export interface VendorCartItem {
  seatId: string;
  section: string;
  row: string;
  seatNumber: string;
  priceLevelId: string;
  price: Money;
  fees: Money;
}
export interface VendorCart {
  cartId: string;
  eventId: string;
  status: CartStatus;
  items: VendorCartItem[];
  holdExpiresAt: string;
  subtotal: Money;
  fees: Money;
  total: Money;
}
export interface VendorBillingRequest {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  payment: {
    /** Tokenised payment instrument from the vendor's/processor's JS SDK. Never raw PAN. */
    paymentToken: string;
    method: 'CARD' | 'WALLET';
  };
  deliveryMethod: 'MOBILE';
}
export interface VendorOrderTicket {
  ticketId: string;
  seatId: string;
  section: string;
  row: string;
  seatNumber: string;
}
export interface VendorOrder {
  orderId: string;
  cartId: string;
  eventId: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
  tickets: VendorOrderTicket[];
  total: Money;
  purchasedAt: string;
}
export type VendorBarcode =
  | { type: 'ROTATING'; secret: string; rotationIntervalSeconds?: number; format: 'QR' | 'PDF417' }
  | { type: 'STATIC'; value: string; format: 'QR' | 'PDF417' };
export interface VendorTicket {
  ticketId: string;
  orderId: string;
  eventId: string;
  eventName: string;
  startsAt: string;
  venue: { name: string; city: string };
  seat: { section: string; row: string; seatNumber: string };
  holderName: string;
  entryGate?: string;
  barcode: VendorBarcode;
}
