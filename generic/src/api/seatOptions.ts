import { formatMoney } from "./format";
import type { AvailableSeat, EventAvailabilityResponse, Money } from "./bridgeTypes";

export interface SeatOption {
  id: string;              // `${section}|${priceAmount}`
  section: string;
  priceLevel: string;      // e.g. "Lower Bowl"
  pricePerSeat: Money;     // face + fees
  row: string;
  seatIds: string[];       // the two adjacent seats, sent to the lock endpoint
  seatLabels: string[];    // e.g. ["A11", "A12"]
}

/**
 * One option per (section, price point): the adjacent pair closest to the
 * middle of its row, so the pair sits in the best part of the section.
 */
export function buildSeatOptions(avail: EventAvailabilityResponse): SeatOption[] {
  const options: SeatOption[] = [];

  for (const sec of avail.sections) {
    const byPrice = new Map<number, AvailableSeat[]>();
    for (const seat of sec.seats) {
      const key = seat.price.total.amount;
      byPrice.set(key, [...(byPrice.get(key) ?? []), seat]);
    }

    for (const [amount, seats] of byPrice) {
      const pair = findBestAdjacentPair(seats);
      if (!pair) continue;
      const [a, b] = pair;
      options.push({
        id: `${sec.section}|${amount}`,
        section: sec.section,
        priceLevel: a.price.level,
        pricePerSeat: a.price.total,
        row: a.row,
        seatIds: [a.seatId, b.seatId],
        seatLabels: [a.row + a.seatNumber, b.row + b.seatNumber],
      });
    }
  }
  return options;
}

function findBestAdjacentPair(seats: AvailableSeat[]): [AvailableSeat, AvailableSeat] | null {
  const rows = new Map<string, AvailableSeat[]>();
  for (const s of seats) rows.set(s.row, [...(rows.get(s.row) ?? []), s]);

  let best: { pair: [AvailableSeat, AvailableSeat]; dist: number } | null = null;

  for (const row of [...rows.keys()].sort()) {
    const list = rows
      .get(row)!
      .map((s) => ({ s, n: Number(s.seatNumber) }))
      .filter((x) => Number.isFinite(x.n))
      .sort((x, y) => x.n - y.n);
    if (list.length < 2) continue;

    const rowMid = (list[0].n + list[list.length - 1].n) / 2;
    for (let i = 0; i < list.length - 1; i++) {
      if (list[i + 1].n !== list[i].n + 1) continue; // must be consecutive numbers
      const pairMid = (list[i].n + list[i + 1].n) / 2;
      const dist = Math.abs(pairMid - rowMid);
      if (!best || dist < best.dist) best = { pair: [list[i].s, list[i + 1].s], dist };
    }
  }
  return best?.pair ?? null;
}

/** "Section 102 (Lower Bowl) - $220" — the level name is omitted when it equals the section name. */
export function optionTitle(o: SeatOption): string {
  const level = o.priceLevel && o.priceLevel !== o.section ? ` (${o.priceLevel})` : "";
  return `Section ${o.section}${level} - ${formatMoney(o.pricePerSeat)}`;
}