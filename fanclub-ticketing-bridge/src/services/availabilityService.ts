import { ticketVendorClient } from '../clients/ticketVendorClient.ts';
import type { Money, VendorPriceLevel, VendorSeat } from '../types/vendor.ts';
import type { AvailableSeat, EventAvailabilityResponse, SectionAvailability } from '../types/api.ts';

/**
 * GA is a property of the event, decided from every seat the vendor returns (held and
 * sold included), so a sold-out GA event is still GA. Shared with cartService.
 */
export function isGeneralAdmissionEvent(seats: readonly VendorSeat[]): boolean {
  return seats.length > 0 && seats.every((s) => s.generalAdmission === true);
}

export async function getEventAvailability(eventId: string): Promise<EventAvailabilityResponse> {
  const data = await ticketVendorClient.getEventAvailability(eventId);
  const priceLevels = new Map<string, VendorPriceLevel>(
    data.priceLevels.map((p) => [p.priceLevelId, p]),
  );
  const totals = { available: 0, held: 0, sold: 0 };
  const bySection = new Map<string, { seats: AvailableSeat[]; generalAdmission: boolean }>();

  for (const seat of data.seats) {
    if (seat.status === 'HELD') totals.held++;
    if (seat.status === 'SOLD') totals.sold++;
    if (seat.status !== 'AVAILABLE') continue;
    totals.available++;
    const pl = priceLevels.get(seat.priceLevelId);
    const mapped: AvailableSeat = {
      seatId: seat.seatId,
      section: seat.section,
      row: seat.row,
      seatNumber: seat.seatNumber,
      attributes: seat.attributes ?? [],
      price: {
        level: pl?.name ?? seat.priceLevelId,
        faceValue: pl?.faceValue ?? zero(),
        fees: pl?.fees ?? zero(),
        total: pl?.total ?? zero(),
      },
    };
    const entry = bySection.get(seat.section) ?? { seats: [], generalAdmission: true };
    entry.seats.push(mapped);
    if (seat.generalAdmission !== true) entry.generalAdmission = false;
    bySection.set(seat.section, entry);
  }

  // GA ticket types stay listed when sold out (availableCount 0, price kept)
  const soldOutGa = new Map<string, Money | null>();
  for (const seat of data.seats) {
    if (seat.generalAdmission !== true || bySection.has(seat.section) || soldOutGa.has(seat.section)) continue;
    soldOutGa.set(seat.section, priceLevels.get(seat.priceLevelId)?.total ?? null);
  }

  const sections: SectionAvailability[] = [
    ...[...bySection.entries()].map(([section, { seats, generalAdmission }]) => ({
      section,
      generalAdmission,
      availableCount: seats.length,
      priceRange: priceRange(seats),
      // GA tickets are counted, not listed: clients lock them by { section, quantity }
      seats: generalAdmission ? [] : seats.sort(seatSort),
    })),
    ...[...soldOutGa.entries()].map(([section, total]) => ({
      section,
      generalAdmission: true,
      availableCount: 0,
      priceRange: total ? { min: total, max: total } : null,
      seats: [],
    })),
  ].sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }));

  return {
    eventId: data.eventId,
    eventName: data.eventName,
    startsAt: data.startsAt,
    saleType: data.saleType,
    generalAdmission: isGeneralAdmissionEvent(data.seats),
    venue: { name: data.venue.name, city: data.venue.city, country: data.venue.country },
    totals,
    sections,
    lastUpdated: data.lastUpdated,
  };
}

function priceRange(seats: AvailableSeat[]): SectionAvailability['priceRange'] {
  if (seats.length === 0) return null;
  let min = seats[0].price.total;
  let max = seats[0].price.total;
  for (const s of seats) {
    if (s.price.total.amount < min.amount) min = s.price.total;
    if (s.price.total.amount > max.amount) max = s.price.total;
  }
  return { min, max };
}

function seatSort(a: AvailableSeat, b: AvailableSeat): number {
  return (
    a.row.localeCompare(b.row, undefined, { numeric: true }) ||
    a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true })
  );
}

const zero = (): Money => ({ amount: 0, currency: 'USD' });