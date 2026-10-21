/**
 * The KOOM 2026 ticket types. Prices and stock come from live inventory; this file only
 * adds the wording and whether a ticket includes the concert (which decides whether the
 * stage on 2C is relevant). `section` must match the GA sections seeded in
 * fanclub-demo/src/db/tourSeed.ts (KOOM_2026_SEATING).
 */
export interface TicketType {
  section: string;
  /** Product name */
  name: string;
  /** What it admits to */
  access: string;
  /** Short form for the ticket face */
  accessShort: string;
  /** Includes the night concert, so the stage is relevant */
  includesConcert: boolean;
}

export const TICKET_TYPES: readonly TicketType[] = [
  {
    section: "Daytime Only",
    name: "KOOM Stage 2026 - Daytime Only",
    access: "KOOM Stage 2026 - Daytime Conference",
    accessShort: "Conference",
    includesConcert: false,
  },
  {
    section: "Night Only",
    name: "KOOM Live 2026 - Night Only",
    access: "KOOM Live 2026 - Concert",
    accessShort: "Concert",
    includesConcert: true,
  },
  {
    section: "All Day Pass",
    name: "KOOM 2026 - All Day Pass",
    access: "Daytime Conference + Night Concert",
    accessShort: "Conference + Concert",
    includesConcert: true,
  },
];

/** Buyers arrive from the Live Concert card, so 2C starts on the night ticket. */
export const DEFAULT_TICKET_SECTION = "Night Only";

/** Metadata for an inventory section; unknown sections get generic GA wording. */
export function ticketTypeFor(section: string): TicketType {
  return (
    TICKET_TYPES.find((t) => t.section === section) ?? {
      section,
      name: section,
      access: "General admission",
      accessShort: "General admission",
      includesConcert: true,
    }
  );
}