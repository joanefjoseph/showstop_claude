import type {
  BillingRequest, BillingResponse, CommitResponse, EventAvailabilityResponse,
  MembershipVerificationResponse, MobileTicketResponse, SeatLockResponse,
} from "./bridgeTypes";

/** Proxied to the bridge by vite.config.ts (server.proxy['/bridge']). */
const BRIDGE_BASE = "/bridge";

export class BridgeError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

interface RequestOptions { body?: unknown; headers?: Record<string, string> }

async function request<T>(method: string, path: string, o: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BRIDGE_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(o.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...o.headers,
      },
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    });
  } catch {
    throw new BridgeError(0, "BRIDGE_UNREACHABLE", "Could not reach the ticketing bridge — is it running on :3000?");
  }

  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : undefined; } catch { /* non-JSON body */ }

  if (!res.ok) {
    // Bridge errors are { error: { code, message, requestId, ... } }; verify's 404 is { verified:false, reason }
    const err = json?.error;
    throw new BridgeError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? json?.reason ?? `Bridge returned HTTP ${res.status}`,
      json,
    );
  }
  return json as T;
}

const enc = encodeURIComponent;

/** The 6 bridge routes. */
export const bridge = {
  /** 1. GET /events/:eventId/availability */
  getAvailability: (eventId: string) =>
    request<EventAvailabilityResponse>("GET", `/events/${enc(eventId)}/availability`),

  /** 2. POST /membership/verify */
  verifyMembership: (email: string) =>
    request<MembershipVerificationResponse>("POST", "/membership/verify", { body: { email } }),

  /** 3. POST /carts/lock */
  lockSeats: (membershipId: string, eventId: string, seatIds: string[]) =>
    request<SeatLockResponse>("POST", "/carts/lock", {
      headers: { "X-Membership-Id": membershipId },
      body: { eventId, seatIds },
    }),

  /** 4. PUT /carts/:cartId/billing */
  attachBilling: (cartId: string, billing: BillingRequest) =>
    request<BillingResponse>("PUT", `/carts/${enc(cartId)}/billing`, { body: billing }),

  /** 5. PUT /carts/:cartId/commit */
  commitCart: (cartId: string, idempotencyKey: string) =>
    request<CommitResponse>("PUT", `/carts/${enc(cartId)}/commit`, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),

  /** 6. GET /tickets/:ticketId */
  getMobileTicket: (ticketId: string, membershipId: string) =>
    request<MobileTicketResponse>("GET", `/tickets/${enc(ticketId)}`, {
      headers: { "X-Membership-Id": membershipId },
    }),
};

export function describeError(err: unknown): string {
  if (err instanceof BridgeError) return `${err.message} (${err.code})`;
  if (err instanceof Error) return err.message;
  return String(err);
}