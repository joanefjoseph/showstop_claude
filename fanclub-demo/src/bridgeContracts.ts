/**
 * Single import point for everything borrowed from the bridge codebase.
 * Paths use `.js` extensions because both projects are now ESM ("type": "module").
 */
export type {
  CartStatus,
  Money,
  SeatStatus,
  VendorAvailabilityResponse,
  VendorBarcode,
  VendorBillingRequest,
  VendorCart,
  VendorCreateCartRequest,
  VendorOrder,
  VendorSeat,
  VendorTicket,
} from '../../fanclub-ticketing-bridge/src/types/vendor.ts';
export type {
  MembershipRecord,
  MembershipStatus,
  MembershipTier,
  MembershipVerifyRequest,
  MembershipVerifyResponse,
} from '../../fanclub-ticketing-bridge/src/types/membership.ts';
export type {
  BillingResponse,
  CommitResponse,
  EventAvailabilityResponse,
  MembershipVerificationResponse,
  MobileTicketResponse,
  SeatLockResponse,
} from '../../fanclub-ticketing-bridge/src/types/api.ts';
export { generateRotatingBarcode } from '../../fanclub-ticketing-bridge/src/services/rotatingBarcode.ts';