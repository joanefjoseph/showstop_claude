/**
 * Everything artist-specific in the generic demo lives in this file, so the whole site can be
 * re-skinned for a prospect by editing the names below (and the CSS accent in index.css).
 * Stop ids must match the event ids in fanclub-demo/src/db/tourSeed.ts (GENERIC_STOPS).
 */
export const ARTIST = "NOVA";
export const TOUR_NAME = "Afterglow World Tour";
export const TOUR_YEAR = "2027";
export const FAN_CLUB = "NOVA Nation";
export const TAGLINE = "Six cities. One night in each that you won't forget.";

export type SaleType = "PRESALE" | "GENERAL";

export interface TourStop {
  id: string;
  city: string;
  country: string;
  venue: string;
  /** PRESALE dates need a fan-club membership with presale access; GENERAL dates need any active account */
  saleType: SaleType;
}

export const STOPS: readonly TourStop[] = [
  { id: "generic-new-york", city: "New York", country: "US", venue: "Harbor Arena", saleType: "PRESALE" },
  { id: "generic-los-angeles", city: "Los Angeles", country: "US", venue: "Pacific Dome", saleType: "PRESALE" },
  { id: "generic-chicago", city: "Chicago", country: "US", venue: "Lakefront Theater", saleType: "GENERAL" },
  { id: "generic-toronto", city: "Toronto", country: "CA", venue: "Northline Centre", saleType: "PRESALE" },
  { id: "generic-austin", city: "Austin", country: "US", venue: "Riverside Amphitheater", saleType: "GENERAL" },
  { id: "generic-london", city: "London", country: "UK", venue: "Meridian Hall", saleType: "GENERAL" },
];

export function findStop(id: string | null): TourStop {
  return STOPS.find((s) => s.id === id) ?? STOPS[0];
}

/** The standing general-admission section; every other section has assigned seats (e.g. A11). */
export const GA_SECTION = "Floor";
export const GA_MAX_PER_ORDER = 4;

/** Post-purchase offers on the ticket page (shown only to someone who just bought). */
export const ADDONS = {
  merch: {
    name: "Tour Bundle: Tee + Album",
    price: 55,
    regular: 80,
    blurb: "Limited tour tee and the new album on vinyl, 31% off for ticket holders only. Pick it up at the merch stand.",
  },
  vip: {
    name: "VIP Upgrade",
    price: 120,
    perks: ["Early entry, 90 minutes before doors", "Soundcheck access", "Laminate and commemorative poster"],
  },
} as const;

/** Tour page FAQ (2A) */
export const FAQ: readonly { q: string; a: string }[] = [
  { q: "When do tickets go on sale?", a: "Fan club presales open first on selected dates. Remaining dates go on sale to everyone at the same time." },
  { q: "How many tickets can I buy?", a: "Up to 4 tickets per order for most shows. Limits may vary by date." },
  { q: "What time are doors and showtime?", a: "Doors open at 6:30 PM and the show starts at 8:00 PM. Check your venue's website for any changes." },
  { q: "Is there an age limit?", a: "All ages are welcome. Guests under 14 must be accompanied by an adult." },
  { q: "Where will I find my tickets after I buy?", a: "Your tickets are delivered digitally to your account right after checkout. There is nothing to print." },
  { q: "Can I get a refund or transfer my tickets?", a: "All sales are final. If a show is cancelled or rescheduled, you will be contacted about refund options." },
  { q: "I need accessible seating. Who do I contact?", a: "Please contact the venue box office directly for accessible seating and accommodations." },
];
