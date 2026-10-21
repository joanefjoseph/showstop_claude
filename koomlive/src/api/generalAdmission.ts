import type { EventAvailabilityResponse, Money } from "./bridgeTypes";
import { getSession } from "./purchaseSession";

/** Upper bound on tickets per order in the picker (the bridge enforces the member's tier limit too). */
export const GA_MAX_PER_ORDER = 4;
export const GA_DEFAULT_QUANTITY = 2;

/** The bridge derives this from the vendor's general_admission flag across every ticket. */
export function isGeneralAdmission(avail: EventAvailabilityResponse): boolean {
  return avail.generalAdmission === true;
}

/**
 * For 2D / 2E: cart and ticket responses don't carry the flag, so use the availability
 * cached in the session for that event (2B/2C load it before any hold exists).
 */
export function isGeneralAdmissionEvent(eventId: string): boolean {
  const { availability } = getSession();
  return availability?.eventId === eventId && availability.generalAdmission === true;
}

export interface GaInventory {
  /** Section label from the vendor, e.g. "General Admission" */
  label: string;
  /** Tickets left */
  available: number;
  /** Face + fees; null when sold out */
  pricePerTicket: Money | null;
}

export function gaInventory(avail: EventAvailabilityResponse): GaInventory {
  const section = avail.sections[0];
  return {
    label: section?.section ?? "General Admission",
    available: avail.totals.available,
    pricePerTicket: section?.priceRange?.min ?? null,
  };
}