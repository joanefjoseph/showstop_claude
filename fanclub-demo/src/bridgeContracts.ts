/**
 * Single import point for everything borrowed from the bridge codebase.
 * The mocks are typed against the bridge's own wire contracts, so
 * `npm run typecheck` fails if a mock response drifts from what the bridge expects.
 *
 * Adjust these paths if the two projects are not sibling folders.
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
} from '../../fanclub-ticketing-bridge/src/types/vendor';
export type {
  MembershipRecord,
  MembershipStatus,
  MembershipTier,
  MembershipVerifyRequest,
  MembershipVerifyResponse,
} from '../../fanclub-ticketing-bridge/src/types/membership';
export type {
  BillingResponse,
  CommitResponse,
  EventAvailabilityResponse,
  MembershipVerificationResponse,
  MobileTicketResponse,
  SeatLockResponse,
} from '../../fanclub-ticketing-bridge/src/types/api';
export { generateRotatingBarcode } from '../../fanclub-ticketing-bridge/src/services/rotatingBarcode';