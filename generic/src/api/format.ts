import type { Money } from "./bridgeTypes";

/** "$220", "$450", "$12.50" — whole dollars drop the decimals. */
export function formatMoney(m: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: Number.isInteger(m.amount) ? 0 : 2,
  }).format(m.amount);
}

/** "Oct 14, 2026, 7:30 PM" */
export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}