import { ticketVendorClient } from '../clients/ticketVendorClient.ts';
import type { Money, VendorPriceLevel } from '../types/vendor.ts';
import type { AvailableSeat, EventAvailabilityResponse, SectionAvailability } from '../types/api.ts';
export async function getEventAvailability(eventId: string): Promise<EventAvailabilityResponse> {
  const data = await ticketVendorClient.getEventAvailability(eventId);
  const priceLevels = new Map<string, VendorPriceLevel>(
    data.priceLevels.map((p) => [p.priceLevelId, p]),
  );
  const totals = { available: 0, held: 0, sold: 0 };
  const bySection = new Map<string, AvailableSeat[]>();
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
    const list = bySection.get(seat.section) ?? [];
    list.push(mapped);
    bySection.set(seat.section, list);
  }
  const sections: SectionAvailability[] = [...bySection.entries()]
    .map(([section, seats]) => ({
      section,
      availableCount: seats.length,
      priceRange: priceRange(seats),
      seats: seats.sort(seatSort),
    }))
    .sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }));
  return {
    eventId: data.eventId,
    eventName: data.eventName,
    startsAt: data.startsAt,
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
