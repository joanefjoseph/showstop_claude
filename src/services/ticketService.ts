import { config } from '../config.ts';
import { ticketVendorClient } from '../clients/ticketVendorClient.ts';
import { generateRotatingBarcode } from './rotatingBarcode.ts';
import type { MobileTicketResponse } from '../types/api.ts';
/** 6. Mobile ticket — looks up the ticket for this member and renders the current barcode. */
export async function getMobileTicket(ticketId: string, membershipId: string): Promise<MobileTicketResponse> {
  const t = await ticketVendorClient.getTicket(ticketId, membershipId);
  let barcode: MobileTicketResponse['barcode'];
  if (t.barcode.type === 'ROTATING') {
    const interval = t.barcode.rotationIntervalSeconds ?? config.BARCODE_ROTATION_SECONDS;
    const rb = generateRotatingBarcode(t.barcode.secret, t.ticketId, interval);
    barcode = {
      format: t.barcode.format,
      value: rb.value,
      rotating: true,
      rotatesEverySeconds: interval,
      validUntil: rb.validUntil.toISOString(),
      nextRotationAt: rb.nextRotationAt.toISOString(),
    };
  } else {
    barcode = { format: t.barcode.format, value: t.barcode.value, rotating: false };
  }
  return {
    ticketId: t.ticketId,
    orderId: t.orderId,
    event: { eventId: t.eventId, name: t.eventName, startsAt: t.startsAt, venue: t.venue.name, city: t.venue.city },
    seat: t.seat,
    holderName: t.holderName,
    entryGate: t.entryGate,
    barcode,
    refreshUrl: `/tickets/${encodeURIComponent(t.ticketId)}`,
  };
}
