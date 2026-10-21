import type { EventAvailabilityResponse, Money } from "./bridgeTypes";
import { getSession } from "./purchaseSession";
import { TICKET_TYPES, ticketTypeFor, type TicketType } from "../data/ticketTypes";

/** Upper bound on tickets per order in the picker (the bridge enforces the member's tier limit too). */
export const GA_MAX_PER_ORDER = 4;
export const GA_DEFAULT_QUANTITY = 1;

/** The bridge derives this from the vendor's general_admission flag across every ticket. */
export function isGeneralAdmission(avail: EventAvailabilityResponse): boolean {
  return avail.generalAdmission === true;
}

/** For 2D / 2E: uses the availability cached in the session for that event. */
export function isGeneralAdmissionEvent(eventId: string): boolean {
  const { availability } = getSession();
  return availability?.eventId === eventId && availability.generalAdmission === true;
}

/** One purchasable GA ticket type with its live stock and price. */
export interface GaOption {
  type: TicketType;
  available: number;
  /** All-in price per ticket; null if the bridge couldn't price it */
  price: Money | null;
}

/** The event's GA ticket types, in the order of src/data/ticketTypes.ts (sold-out ones included). */
export function gaOptions(avail: EventAvailabilityResponse): GaOption[] {
  const rank = (section: string) => {
    const i = TICKET_TYPES.findIndex((t) => t.section === section);
    return i === -1 ? TICKET_TYPES.length : i;
  };
  return avail.sections
    .map((s) => ({ type: ticketTypeFor(s.section), available: s.availableCount, price: s.priceRange?.min ?? null }))
    .sort((a, b) => rank(a.type.section) - rank(b.type.section));
}