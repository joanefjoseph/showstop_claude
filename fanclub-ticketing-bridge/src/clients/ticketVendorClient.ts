import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { HttpClient } from './httpClient.ts';
import type {
  VendorAvailabilityResponse,
  VendorBillingRequest,
  VendorCart,
  VendorCreateCartRequest,
  VendorOrder,
  VendorTicket,
} from '../types/vendor.ts';
export class TicketVendorClient {
  private readonly http: HttpClient;
  constructor() {
    this.http = new HttpClient({
      name: 'ticket-vendor',
      baseUrl: config.TICKET_VENDOR_BASE_URL,
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      defaultHeaders: {
        'X-Api-Key': config.TICKET_VENDOR_API_KEY,
        'X-Partner-Id': config.TICKET_VENDOR_PARTNER_ID,
      },
    });
  }
  /** 1. Seat map / inventory for an event. */
  getEventAvailability(eventId: string): Promise<VendorAvailabilityResponse> {
    return this.http.get(`/events/${encodeURIComponent(eventId)}/availability`);
  }
  /** 3. Create a cart that places a timed hold on the given seats. */
  createCart(req: VendorCreateCartRequest, membershipId: string): Promise<VendorCart> {
    return this.http.post('/carts', {
      body: req,
      headers: {
        'X-Membership-Id': membershipId,
        'Idempotency-Key': randomUUID(),
      },
    });
  }
  /** 4. Attach billing/payment details to an open cart. */
  updateBilling(cartId: string, billing: VendorBillingRequest): Promise<VendorCart> {
    return this.http.put(`/carts/${encodeURIComponent(cartId)}/billing`, { body: billing });
  }
  /** 5. Commit the cart -> converts holds into a confirmed order. */
  commitCart(cartId: string, idempotencyKey: string): Promise<VendorOrder> {
    return this.http.put(`/carts/${encodeURIComponent(cartId)}/commit`, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }
  /** 6. Fetch a ticket (scoped to the member who purchased it). */
  getTicket(ticketId: string, membershipId: string): Promise<VendorTicket> {
    return this.http.get(`/tickets/${encodeURIComponent(ticketId)}`, {
      headers: { 'X-Membership-Id': membershipId },
    });
  }
}
export const ticketVendorClient = new TicketVendorClient();
